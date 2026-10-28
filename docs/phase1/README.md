# HookZ UI/UX overhaul — Phase 1

Implemented 28 October 2026. Local implementation and verification are complete. The live database migration and production deployment have not been performed.

## Step 0 — audit

The audit was presented before code changes. [ARCHITECTURE.md](ARCHITECTURE.md) records the frontend/backend inventory, auth flow, components, full route map, and risks; [STACK.md](STACK.md) records the installed stack and dependencies.

The original instructions prohibited backend/schema changes. The user subsequently approved minimal backend/schema work to enable a single final onboarding submission. Only migration 015 was added for this purpose; existing Express changes in the checkout predate this task.

## Step 1 — shared theme

- Introduced violet/ink/warm-neutral/lime tokens, Inter Tight headings, spacing/radius/shadow/motion scales, light/dark native controls, focus states, and reduced-motion behavior.
- Restyled shared buttons, cards, inputs, avatar fallback, navigation, Settings appearance control, and modal. Badges, dropdowns, tabs, and notifications inherit the updated shared Tailwind palette.
- Replaced legacy surface/action literals in existing pages without modifying their feature behavior. Native dialog supplies focus containment, Escape dismissal, and focus restoration.

Files: [complete file inventory](files.json), group 1. Full updated-code diffs: [step-1.patch](step-1.patch).

Step 1 complete — no out-of-scope code was modified.

Browser check: switch appearance from Settings, open a modal, navigate by keyboard, and compare directory cards and tabs in both themes.

## Step 2 — landing

- Rebuilt the student-first hero with two CTAs and lightweight animated team cards.
- Added campus strip, three value propositions, four-step flow, interactive Connections preview, illustrative community stories, final CTA, and minimal footer in the required order.
- Added mobile layouts, scroll reveals, hover motion, reduced-motion handling, and sample-content labels. No unverified community metrics are represented as real.

Files: `client/src/pages/PublicLandingPage.tsx`, `PublicLandingPage.css`. Full diffs: [step-2.patch](step-2.patch).

Step 2 complete — no out-of-scope code was modified.

Browser check: exercise Join Free / Sign In, anchor links, preview filters, and all sections at mobile/tablet/desktop widths.

## Step 3 — authentication screens

- Rebuilt login and initial signup around a shared centered card and background.
- Signup asks only email, password, confirmation, and terms/privacy agreement. Profile details and role grids are removed from signup and the Google callback.
- Kept Supabase OAuth, password/username login compatibility, email confirmation/resend, error feedback, and recovery links. The callback routes returning members home and new members into onboarding.

Files: `client/src/components/auth/AuthLayout.tsx`, `AuthLayout.css`, `client/src/pages/Auth/LoginPage.tsx`, `RegisterPage.tsx`, `AuthCallbackPage.tsx`. Full diffs: [step-3.patch](step-3.patch).

Step 3 complete — no out-of-scope code was modified.

Browser check: use staging accounts to test immediate signup, email-confirmed signup, Google signup/login, resend, password login, and recovery.

## Step 4 — onboarding

- Student: 10 questions; Investor: 8; Other: 7. Each branch ends in a profile preview and explicit consent choices.
- Enter continues, arrow keys navigate choices, Back preserves answers, skills are searchable/customizable, college suggestions allow free text, and optional bio is limited to 160 characters.
- Answers remain local until one `complete_onboarding` RPC. It validates and commits profile fields, structured answers, role, consent records, and completion together. Errors preserve local answers; retries are idempotent.
- Added a central incomplete-user gate, isolated auth/onboarding layouts, completed-user redirects, and profile-first completion mapping. Existing accounts retain access.

Files: `client/src/pages/Onboarding/{OnboardingPage.tsx,OnboardingPage.css,questions.ts}`, `client/src/App.tsx`, `client/src/lib/supabase.ts`, `supabase/migrations/015_onboarding_completion.sql`, and three test scripts. Full diffs: [step-4.patch](step-4.patch).

The final `App.tsx` diff includes the shell changes shared by Steps 1–4. Review patches include complete new file contents and unified diffs for changed files; pre-existing security edits are excluded.

Step 4 complete — no out-of-scope code was modified. The migration falls within the user's explicit scope extension.

Browser check: complete every branch, change roles using Back, trigger a failed save and retry, refresh after completion, and verify existing users skip setup.

## Verification

| Check | Result |
| --- | --- |
| `npm --prefix client run build` | Pass; [build output](build.txt) |
| `npm --prefix client run lint` | 0 errors; 358 pre-existing warnings remain; [lint output](lint.txt) |
| `node scripts/test-onboarding.mjs` | Pass: branch lengths, required/optional fields, limits, selected values, stale-branch exclusion |
| `node scripts/test-onboarding-db.mjs` | Pass in isolated PostgreSQL: migration rerun, legacy preservation, all branches, invalid inputs, auth/ownership, rollback, retry idempotence |
| `node scripts/test-phase1-ui.cjs` | Pass: landing/auth at 1440/768/375 in both themes; preview filters; password mismatch; all onboarding branches; keyboard/back; consent; one save; failed-save retry; completed-user redirect; settings switch; modal Escape |
| Existing route smoke checks | 18 routes in light desktop and dark mobile; no overflow, runtime exceptions, or error-boundary failures |

Screenshots are in [screenshots/](screenshots/). The UI script launches a temporary Vite server on port 5179 and headless Edge. Authenticated journeys and directory responses are intercepted with test data; no real account or database is modified. PostgreSQL tests run entirely in memory. Google OAuth and email delivery require the separate staging checks above.

## Deployment prerequisite

Apply **only** `supabase/migrations/015_onboarding_completion.sql` to the intended Supabase database after migrations 001–014, then deploy the frontend. Do not use the existing `migrate:supabase` runner for this incremental rollout: it concatenates all migrations, and migration 001 drops existing tables.

Migration 015 is transactional and rerunnable. It adds profile completion, structured answers, and the category flag, preserves existing members, sets new profiles to incomplete, and exposes the authenticated RPC. It relies on existing auth-created profiles and `consent_logs` from migration 013. Do not deploy the new onboarding UI before the RPC exists.

No application dependencies or lockfiles changed. Existing uncommitted security work was preserved.

## Phase 2 recommendations

- Replace illustrative campus names, profiles, and stories with approved community content and verified metrics.
- Extend staged provider tests through email delivery and real Google consent/return flows.
- Plan durable draft recovery and member editing of the structured onboarding answers if user research supports them.
- Consolidate the existing Prisma/Supabase synchronization separately; this phase does not attempt a backend rewrite.

Design references reviewed: [Linear](https://linear.app/), [Vercel](https://vercel.com/), [Framer](https://www.framer.com/), [Arc](https://arc.net/), [Raycast](https://www.raycast.com/), [Typeform](https://www.typeform.com/). Their hierarchy, product previews, and focused question flow informed the direction; no external assets were copied.
