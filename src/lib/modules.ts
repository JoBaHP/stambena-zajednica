// Akcenat po modulu. Vrednosti su CSS promenljive iz globals.css, pa se boja
// menja na jednom mestu. `color` ide na ikonicu, `tint` na kvadrat iza nje —
// namerno tiho: dvanaest modula sa jakom bojom izgleda kao igracka.

export type ModuleKey =
  | "pregled"
  | "finansije"
  | "obavestenja"
  | "glasanje"
  | "tenderi"
  | "zahtevi"
  | "stanari"
  | "kalendar"
  | "inspekcije"
  | "investicije"
  | "arhiva"
  | "kontakti"

export const moduleAccent: Record<ModuleKey, { color: string; tint: string }> = {
  pregled: { color: "var(--m-pregled)", tint: "var(--m-pregled-tint)" },
  finansije: { color: "var(--m-finansije)", tint: "var(--m-finansije-tint)" },
  obavestenja: { color: "var(--m-obavestenja)", tint: "var(--m-obavestenja-tint)" },
  glasanje: { color: "var(--m-glasanje)", tint: "var(--m-glasanje-tint)" },
  tenderi: { color: "var(--m-tenderi)", tint: "var(--m-tenderi-tint)" },
  zahtevi: { color: "var(--m-zahtevi)", tint: "var(--m-zahtevi-tint)" },
  stanari: { color: "var(--m-stanari)", tint: "var(--m-stanari-tint)" },
  kalendar: { color: "var(--m-kalendar)", tint: "var(--m-kalendar-tint)" },
  inspekcije: { color: "var(--m-inspekcije)", tint: "var(--m-inspekcije-tint)" },
  investicije: { color: "var(--m-investicije)", tint: "var(--m-investicije-tint)" },
  arhiva: { color: "var(--m-arhiva)", tint: "var(--m-arhiva-tint)" },
  kontakti: { color: "var(--m-kontakti)", tint: "var(--m-kontakti-tint)" },
}
