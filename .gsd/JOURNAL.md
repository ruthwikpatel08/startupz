# Validation journal

## 2026-10-28 — Phase 2 recovery

- Live rollback-only probe: `42P01 relation "public.consent_logs" does not exist`, function `complete_onboarding`, line 103. Previous deployment check missed the table dependency.
- Applied migration 016 only: `{ rpc_exists: true, consent_table_exists: true }`.
- `node scripts/test-onboarding-live.mjs`: `PASS real Auth + browser + PostgREST 200 + database profile/consents + refresh`. Temporary account removed. Redacted evidence: `docs/phase2-recovery/onboarding-live.json`.
- Isolated SQL test first reproduces the missing consent table/rollback, applies repair twice, then passes 3 roles, input rejection, atomic rollback, retries, authenticated-only execution and owner isolation.
- Product browser checks pass 8 routes at 1440/375 in light/dark, exact card/button tokens, dialogs and persisted toggle. Desktop/mobile dropdowns, AI dialog and saved toast checks pass. Screenshots: `docs/phase2-recovery/screenshots`.
- Existing regression script passes 6 landing/auth viewport-theme combinations, 3 onboarding branches and 18 routes in two themes. All login/signup PNGs are byte-identical to previous baseline. Landing/auth source diff is empty.
- Build: 2114 modules, successful TypeScript/Vite build. Lint: exit 0, 342 warnings, no errors. `git diff --check`: clean.
- Frontend changes remain local; database repair is applied. Detailed evidence/limitations: `docs/phase2-recovery/README.md`.
