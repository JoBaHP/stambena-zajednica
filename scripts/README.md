# Skripte

## get-drive-refresh-token.ts

Jednokratno hvata Google OAuth refresh token koji koristimo za upload/download fajlova u Drive (server-strana, kao licni nalog vlasnika foldera).

```bash
cd pasterova-16
npx tsx scripts/get-drive-refresh-token.ts
```

Trazi `GDRIVE_OAUTH_CLIENT_ID` i `GDRIVE_OAUTH_CLIENT_SECRET` u `.env`. Otvori browser → consent → ispise `GDRIVE_OAUTH_REFRESH_TOKEN=...` u terminal koji prebacis u `.env` (i Vercel env vars).

## mirror-all-to-drive.ts

Upisuje sve postojece zapise iz baze u citljive dokumente na Google Drive. Aplikacija to radi automatski pri kreiranju i izmeni (`src/lib/drive-mirror/`), pa ova skripta sluzi za **prvo popunjavanje** (zapisi nastali pre te automatike) i za ciscenje zaostalih gresaka.

```bash
cd pasterova-16
DATABASE_URL='<url>' npx tsx scripts/mirror-all-to-drive.ts
```

Opcije preko env varijabli:

| Varijabla | Znacenje |
| --- | --- |
| `MIRROR_FORCE=1` | ponovo renderuj sve, cak i ono sto je vec sinhronizovano (fajl se prepisuje samo ako se sadrzaj stvarno promenio) |
| `MIRROR_ENTITIES=ANNOUNCEMENT,TRANSACTION` | samo navedeni entiteti |
| `MIRROR_BATCH=25` | broj zapisa po turi |

Entiteti: `ANNOUNCEMENT`, `TRANSACTION`, `REQUEST`, `TASK`, `INSPECTION`, `INVESTMENT`, `POLL`, `TENDER`, `CONTACT`, `RESIDENT`.

### Sta upisuje gde

Sve ide u koren `GDRIVE_ARCHIVE_FOLDER_ID`. Dva sloja: **citljivi `.txt` za ljude** i **JSON snimci za aplikaciju**.

```text
Obavestenja/<godina>/<Naslov>_<id>.txt
Finansije/<godina>/<Mesec>/<Opis>_<id>.txt
Zahtevi/<godina>/<Naslov>_<id>.txt
Kalendar/<godina>/<Naslov>_<id>.txt
Inspekcije/<godina>/<Naslov>_<id>.txt
Investicije/<godina>/<Naslov>_<id>.txt
Glasanja/<godina>/<Naslov>_<id>.txt      (pored postojecih CSV izvoza)
Tenderi/<naslov tendera>/_Tender.txt     (pored fajlova ponuda)
Kontakti/Kontakti.txt                    (zbirni registar)
Stanari/Stanari.txt                      (zbirni registar)

_Podaci/Obavestenja.json                 (masinski citljiv snimak modula)
_Podaci/Finansije.json                   (+ kategorije)
_Podaci/Zahtevi.json                     (+ komentari)
_Podaci/Kalendar.json
_Podaci/Inspekcije.json
_Podaci/Investicije.json
_Podaci/Glasanja.json                    (+ opcije i glasovi)
_Podaci/Tenderi.json                     (+ ponude i glasovi)
_Podaci/Kontakti.json
_Podaci/Stanari.json                     (bez hesa lozinke)
_Podaci/Arhiva.json                      (metapodaci digitalne arhive)
```

Sufiks `<id>` u imenu je poslednjih 6 znakova cuid-a, pa izmena naslova ne pravi novi fajl — postojeci se preimenuje i prepise. Fajl se dira samo ako se sadrzaj (ili ime) stvarno promenio.

### Sta NE radi

- **Ne brise nista sa Drive-a.** Kad se zapis obrise u aplikaciji, njegov citljiv dokument na Drive-u ostaje netaknut. JSON snimak i zbirni registri (kontakti, stanari) prikazuju trenutno stanje, pa obrisani zapis iz njih ispada.
- Glasovi po glasu ne pokrecu upis (dokument glasanja se osvezava pri aktiviranju i zatvaranju).
- Hes lozinke ne izlazi iz baze — `Stanari.json` ga ne sadrzi.

## restore-from-drive.ts

Vraca podatke sa Drive-a u bazu iz `_Podaci/*.json`. Citljivi `.txt` se ne parsira — on je za ljude.

```bash
cd pasterova-16

# 1) probni prolaz — samo ispisuje sta bi uradio
DATABASE_URL='<url>' npx tsx scripts/restore-from-drive.ts

# 2) stvarni upis
RESTORE_CONFIRM=yes DATABASE_URL='<url>' npx tsx scripts/restore-from-drive.ts
```

- Upis je **upsert po id-u**: postojeci zapisi se azuriraju, nedostajuci prave. **Nista se ne brise.**
- Redosled poštuje strane kljuceve: stanari → kontakti → finansije → obavestenja → kalendar → inspekcije → investicije → tenderi → glasanja → zahtevi → arhiva.
- Korisnici koji se vracaju a ne postoje u bazi dobijaju **nasumicnu lozinku** (hes se ne izvozi) — resetuj je preko `/dashboard/stanari/<id>`.
- Fajlovi digitalne arhive i ponuda tendera ostaju na Drive-u; `Arhiva.json`/`Tenderi.json` vracaju `fileId` pa linkovi za preuzimanje rade i posle vracanja.

### Stanje sinhronizacije

Upravnik vidi broj upisanih/na cekanju/gresaka i dugme „Sinhronizuj sada" na `/dashboard/podesavanja`. Greska na Drive-u nikad ne prekida akciju korisnika — upisuje se u tabelu `DriveMirror` (`lastError`) i vidi se tamo.

Za lokalni razvoj bez pisanja u pravi Drive: `DRIVE_MIRROR_DISABLED=1` u `.env`.

**Poznato ogranicenje:** razresavanje foldera radi „potrazi pa napravi" bez transakcije, pa dva paralelna upisa u istoj sekundi teorijski mogu napraviti dva foldera istog imena. Id-evi foldera se kesiraju u memoriji procesa, pa se to svodi na prvi upis posle hladnog starta.

## reset-prod-data.ts

**Destruktivna skripta** — brise sve podatke iz baze osim odredjenog super admin korisnika i ostavlja njega kao MANAGER + active. Koristi se za reset produkcionog testnog okruzenja.

### Sta brise

Sve transakcije, kategorije, obavestenja, glasanja, glasove, zahteve, komentare, dokumente, investicije, PP inspekcije, taskove, kontakte, dokumente arhive, zahteve za pristup, sesije, accounts, verification tokens, sve korisnike osim `szpasterova16@gmail.com`.

### Sta NE brise

- **Fajlove na Google Drive** — moras rucno iz `Pasterova 16 - Arhiva/...` i `Racuni stambene zajednice/<godina>/<mesec>/...`
- Migration history (`_prisma_migrations` tabelu)

> Posle reseta na Drive-u ostaju i citljivi dokumenti i `_Podaci/*.json` snimci, pa se stanje moze vratiti sa `restore-from-drive.ts`. Ako ti to nije namera, obrisi i te foldere rucno.

### Pokretanje

1. Uzmi prod `DATABASE_URL` iz Vercel env vars (Supabase pooled, port 6543).
2. (Preporuceno) Napravi backup pre toga:

   ```bash
   pg_dump '<prod-direct-url-port-5432>' > prod-backup-$(date +%Y%m%d-%H%M).sql
   ```

3. Pokreni:

   ```bash
   cd pasterova-16
   RESET_CONFIRM=yes \
   DATABASE_URL='postgres://postgres.<ref>:<pass>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres' \
   RESET_USER_PASSWORD='izaberi_jaku_lozinku' \
   npx tsx scripts/reset-prod-data.ts
   ```

   Bez `RESET_CONFIRM=yes` skripta odbija da se pokrene.
   Bez `RESET_USER_PASSWORD` koristi default `SZpasterova16!`.

4. Skripta ce ispisati cilj baze (sa maskiranim password-om) pre nego krene — proveri da je to bas ono sto zelis.

### Posle resetovanja

- Prijavi se sa `szpasterova16@gmail.com` i lozinkom koju si zadao.
- Promeni lozinku odmah preko `/dashboard/podesavanja`.
- Po potrebi rucno obrisi i Drive foldere.
