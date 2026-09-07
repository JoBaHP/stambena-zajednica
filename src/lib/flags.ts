// Prekidaci za funkcije koje su napravljene ali jos nisu puštene svima.

/**
 * Da li stanari vide finansije zajednice.
 *
 * Prikaz je napravljen (`finansije/resident-view.tsx`) i radi, ali stoji
 * zatvoren dok upravnik ne pregleda kako izgleda sa pravim podacima iz tabele.
 * Kada se pusti: samo promeni na `true` — ruta i navigacija to citaju odavde.
 */
export const RESIDENT_FINANCE_VISIBLE = false
