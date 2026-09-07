-- Twilio je uklonjen: SMS obavestenja nikad nisu bila konfigurisana i cirilicni
-- SMS bi kostao 2-3x vise po poruci (70 znakova po segmentu umesto 160).
-- Kolona je bila prazna — nijedan korisnik nije imao notifySms = true.
ALTER TABLE "User" DROP COLUMN "notifySms";
