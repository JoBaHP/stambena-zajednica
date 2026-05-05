# Skripte

## get-drive-refresh-token.ts

Jednokratno hvata Google OAuth refresh token koji koristimo za upload/download fajlova u Drive (server-strana, kao licni nalog vlasnika foldera).

```bash
cd pasterova-16
npx tsx scripts/get-drive-refresh-token.ts
```

Trazi `GDRIVE_OAUTH_CLIENT_ID` i `GDRIVE_OAUTH_CLIENT_SECRET` u `.env`. Otvori browser → consent → ispise `GDRIVE_OAUTH_REFRESH_TOKEN=...` u terminal koji prebacis u `.env` (i Vercel env vars).

## reset-prod-data.ts

**Destruktivna skripta** — brise sve podatke iz baze osim odredjenog super admin korisnika i ostavlja njega kao MANAGER + active. Koristi se za reset produkcionog testnog okruzenja.

### Sta brise

Sve transakcije, kategorije, obavestenja, glasanja, glasove, zahteve, komentare, dokumente, investicije, PP inspekcije, taskove, kontakte, dokumente arhive, zahteve za pristup, sesije, accounts, verification tokens, sve korisnike osim `szpasterova16@gmail.com`.

### Sta NE brise

- **Fajlove na Google Drive** — moras rucno iz `Pasterova 16 - Arhiva/...` i `Racuni stambene zajednice/<godina>/<mesec>/...`
- Migration history (`_prisma_migrations` tabelu)

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
