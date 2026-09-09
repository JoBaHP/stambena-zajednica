-- Zatvaranje javnog pristupa bazi preko Supabase REST API-ja (PostgREST).
--
-- Stanje pre ovoga: RLS iskljucen na svim tabelama, a role `anon` i
-- `authenticated` imale SELECT/INSERT/UPDATE/DELETE/TRUNCATE na svih 24 —
-- dakle svako sa anon kljucem projekta mogao je da cita i menja sve, ukljucujuci
-- User.password i Account.refresh_token.
--
-- Aplikacija ne koristi PostgREST: povezuje se Prisma-om preko TCP-a kao
-- `postgres`, koji ima rolbypassrls = true, pa ga RLS ne dodiruje.
--
-- Tri sloja, jer nijedan sam nije dovoljan:
--   1. RLS — bez politika PostgREST ne vraca ni jedan red
--   2. oduzimanje prava — RLS NE filtrira TRUNCATE, samo oduzimanje ga zatvara
--   3. podrazumevana prava — inace bi sledeca Prisma migracija koja napravi
--      tabelu ponovo dala anon-u sva prava (pg_default_acl: anon=arwdDxtm)

-- ─── 1. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE "AccessRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArchiveDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DriveMirror" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Investment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PPInspection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Poll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PollOption" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RequestComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenderOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TenderVote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransactionCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- ─── 2. i 3. prava ─────────────────────────────────────────────────────────
-- Uslovno, da migracija prodje i na obicnom Postgresu gde te role ne postoje.
DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
