# HookZ Phase 2

## Scope and implementation

Approved landing and login/signup source files, styles, assets, and central tokens were left unchanged.

### Task 0: audit

Approved palette: primary #7047eb, hover #5b32cf, ink #201d32, muted #716c83, page #f7f7fb, surface #ffffff, border #e4e1ed, lime #d5f478, peach #e8b8a2. Inter Tight headings / Inter body; radii 8/12/16/24px; shared shadow-sm/md/lg and 160/280ms motion. Existing btn-primary gradient, card-base and input-base remain the design source.

Legacy product controls and navigation had inconsistent surfaces and density. Opportunities contained job/internship tabs, posting and application forms, equity language and founder-hiring sections. Onboarding called a missing RPC and hid plain-object Supabase errors. Its footer used a literal star in place of the approved mark.

Task #0 complete — no out-of-scope code was modified.

### Task 1: theme propagation

Plan: preserve tokens; scope treatment to product routes; retain layouts and feature behavior.
Files: client/src/App.tsx; client/src/product.css.
Coverage: navigation, sidebar, shared cards, form controls, buttons, headings, status and semantic tabs across Home, Feed, Projects, Business, Opportunities, Profile and Settings. Landing/auth excluded through the existing route classification.
Browser: inspect these pages at desktop/mobile widths; switch Settings appearance; verify inputs and focus visibility.
Task #1 complete — no out-of-scope code was modified.

### Task 2: problem statements

Plan: delete marketplace UI; reuse discoverAIProblems contract; implement accessible states and minimal controls.
File: client/src/pages/Opportunities/OpportunitiesPage.tsx.
The route is unchanged. Its only content is Problem Statements, domain selection, generation/refresh and statement cards with expandable descriptions, tags and validated HTTP(S) source links. Existing Gemini discovery and its curated fallback are reused; no key is exposed in the client.
Browser: visit /opportunities; choose a domain; Generate statements; expand View statement; simulate network failure and retry. No posting, application, internship, job or equity controls remain.
Task #2 complete — no out-of-scope code was modified.

### Task 3: save failure

Plan: inspect submit payload/session/write path; verify deployed RPC; deploy only the tested incremental migration; retain UI and surface development diagnostics.
Files: client/src/pages/Onboarding/OnboardingPage.tsx; scripts/check-onboarding-deployment.mjs.
Read-only database check returned rpc_exists=false. Applied only supabase/migrations/015_onboarding_completion.sql after isolated PostgreSQL tests passed. Follow-up returned rpc_exists=true; PostgREST was notified to reload its schema. No old migration or seed was replayed.
Existing RPC validates branch fields, derives ownership from auth.uid(), saves answers/profile/consents/completion in one transaction, and returns the saved profile. Frontend updates local user state only after confirmed completion. Plain-object errors now expose their message in development and retain a clean production message.
Browser: finish each branch with consent, Enter HookZ, refresh, and revisit /onboarding. Completed users should return home. A failed write must preserve answers and allow retry.
Task #3 complete — no out-of-scope code was modified.

### Task 4: logo

Plan: compare asset hashes; replace only the incorrect mark; preserve approved artwork.
File: client/src/pages/Onboarding/OnboardingPage.tsx.
Replaced literal HookZ star footer with the exact landing logo import. Public and source logo files have identical SHA-256 hashes; Navbar/Footer/Avatar already use the correct artwork.
Browser: inspect onboarding preview and footer in both themes.
Task #4 complete — no out-of-scope code was modified.

## Checks and limits

Run npm --prefix client run build; node scripts/test-onboarding.mjs; node scripts/test-onboarding-db.mjs; node scripts/test-phase1-ui.cjs. The latter now checks generated problem cards, absence of marketplace controls, and rejection of executable source URLs alongside the existing responsive and onboarding regressions.

Database deployment was verified against the configured PostgreSQL database. Browser auth/save journeys use mocked identities; no real user account was created or modified for testing. A real Google/email session should still receive a staging acceptance check. Gemini generation depends on the existing server key/provider; the existing fallback is explicitly disclosed in the UI.

See changes.patch for complete source diffs. Product structure and Business content were preserved.
