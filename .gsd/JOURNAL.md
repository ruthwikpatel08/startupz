# Validation journal

## 2026-11-03 — Unified feed and AI Scout

- Replaced separate feed categories with one newest-first timeline. Removed legacy category labels and filters, retained existing idea voting, prototype demos, audience controls and publishing paths.
- `npm.cmd --prefix client run build`: exit 0, 2117 modules, successful TypeScript/Vite build.
- `node scripts/test-product-theme.cjs --feed`: six PASS results at 1440/375/320px in light/dark. Actual output: `PASS mixed timeline, chronological order, audience, legacy links, publishing formats, both votes, likes, saves, share, comments, expansion, prototype modal and Scout motion`.
- Mocked browser checks verify UI interaction and request payloads, exclude a private post, and detect page/card overflow and runtime errors. No live backend writes. Screenshots inspected at desktop and mobile; fixed sidebar style inheritance and cramped prototype header.
- Targeted lint exit 0 with existing warnings; strict warning-as-error mode does not pass. Build and final browser suite pass. `git diff --check` passes.
- Evidence and research: `docs/feed-overhaul/README.md`, screenshots in `docs/feed-overhaul/screenshots`. Changes are local, not deployed.

## 2026-10-28 — Phase 2 recovery

- Live rollback-only probe: `42P01 relation "public.consent_logs" does not exist`, function `complete_onboarding`, line 103. Previous deployment check missed the table dependency.
- Applied migration 016 only: `{ rpc_exists: true, consent_table_exists: true }`.
- `node scripts/test-onboarding-live.mjs`: `PASS real Auth + browser + PostgREST 200 + database profile/consents + refresh`. Temporary account removed. Redacted evidence: `docs/phase2-recovery/onboarding-live.json`.
- Isolated SQL test first reproduces the missing consent table/rollback, applies repair twice, then passes 3 roles, input rejection, atomic rollback, retries, authenticated-only execution and owner isolation.
- Product browser checks pass 8 routes at 1440/375 in light/dark, exact card/button tokens, dialogs and persisted toggle. Desktop/mobile dropdowns, AI dialog and saved toast checks pass. Screenshots: `docs/phase2-recovery/screenshots`.
- Existing regression script passes 6 landing/auth viewport-theme combinations, 3 onboarding branches and 18 routes in two themes. All login/signup PNGs are byte-identical to previous baseline. Landing/auth source diff is empty.
- Build: 2114 modules, successful TypeScript/Vite build. Lint: exit 0, 342 warnings, no errors. `git diff --check`: clean.
- Frontend changes remain local; database repair is applied. Detailed evidence/limitations: `docs/phase2-recovery/README.md`.

## 2026-11-03 — Optional feed format filter
- Added Show: All posts / Ideas / Prototypes / Updates. Viewing selection is independent of creation format; mixed feed remains the default.
- Existing prototype form collects problem, solution, description, demo link and media. Idea and update composer retains format selection and contextual prompts.
- Production build passes. Extended browser regression asserts exact visible post IDs for each filter in six viewport/theme combinations; existing posting and interaction checks retained.

