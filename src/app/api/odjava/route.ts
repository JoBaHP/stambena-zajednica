import { signOut } from "@/auth"

// Prisilna odjava: brise session cookie i vraca na prijavu.
//
// Zove se kad auth() vrati null a korisnik ima cookie — u praksi kad mu je
// uklonjen pristup dok je bio prijavljen. Mora da bude route handler jer samo
// on moze da postavi cookie (server komponenta ne moze), a putanje pod /api/
// nisu u matcher-u iz proxy.ts pa nema petlje sa preusmeravanjem.
export async function GET() {
  await signOut({ redirectTo: "/login?odjava=pristup" })
}
