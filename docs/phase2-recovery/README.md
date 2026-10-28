# Phase 2 recovery — verified 28 October 2026

The database repair is applied to the configured Supabase project. Frontend changes are in this checkout and build successfully; this turn did not publish a frontend deployment. Landing, login/signup, shared global tokens, and onboarding questions remain unchanged.

## Task A — onboarding save

**Root cause:** the deployed `complete_onboarding` function existed, but its required `public.consent_logs` table from migration 013 did not. Its final INSERT raised PostgreSQL `42P01: relation "public.consent_logs" does not exist`, rolling back the preceding profile update and completion flag. The earlier check only tested function existence, and the isolated test fixture created a consent table itself, hiding the missing deployment dependency.

The exact handler is `finish()` in `client/src/pages/Onboarding/OnboardingPage.tsx`. It calls `POST /rest/v1/rpc/complete_onboarding`, directly through the authenticated Supabase client. Express's API base URL does not participate in this save. A live rollback-only synthetic signup reproduced the error at line 103 of the deployed function.

**Repair:** migration 016 restores only the existing consent-table schema, indexes, owner-bound RLS policies and grants. It does not replay migration 001 or change onboarding questions. Applied result: `{ rpc_exists: true, consent_table_exists: true }`. The database test now first reproduces the missing-table failure, verifies the profile rollback, applies the repair twice, and runs all three role branches.

**Before/after request:** unchanged. Camel-case answer fields are deliberately nested inside the JSONB `p_answers` argument; the SQL function translates them to snake-case profile columns. Example from the real browser run:

```json
{
  "p_answers": {
    "role": "Student", "fullName": "Recovery Browser Test",
    "college": "Test University", "year": "1st Year", "major": "Test University",
    "primaryRole": "Frontend", "skills": ["React"], "hackathons": "0",
    "lookingFor": ["Hackathon teammates"], "bio": "Test University"
  },
  "p_profile_consent": true,
  "p_terms_consent": true
}
```

**Response handling:** previously the SQL error reached the generic production message. After repair the real HTTP response is **200**, with the saved profile and `onboarding_completed: true`. The client still invalidates the profile cache, maps the returned row, updates AuthContext/localStorage and navigates Home. Development logging now includes HTTP status, PostgreSQL code, message, details and hint; it never logs access tokens or users' answer payloads. Production keeps the clean retry message.

**Evidence:** [real browser request/response and assertions](onboarding-live.json), [success screenshot](onboarding-live-success.png), [complete Task A diff](task-a.patch).

**Failure checklist:**

| Possible failure | Verification |
| --- | --- |
| Payload/schema mismatch | Real browser payload accepted; all persisted answers equal submitted answers |
| Missing required fields | Client and SQL tests reject incomplete branch answers; all three valid branches pass |
| Username uniqueness/null | Final save does not create/change usernames; live signup trigger created the initial profile and final update succeeded |
| RLS / wrong user | Authenticated RPC succeeds; isolated tests deny anonymous execution and verify owner isolation |
| Wrong env/project/key | Client/server Supabase host equality asserted; real anon-key + signed-in bearer session used; resulting row read from configured PostgreSQL |
| Lost actual error | Dev console includes exact response status/code/message; answers survive simulated error/retry |
| Success ignored/store stale | Local completion asserted immediately, Home redirect asserted, refresh and direct onboarding revisit stay on Home |
| Duplicate submit / mount | Synchronous `savingRef` guard remains; browser asserts one final request; SQL retry is idempotent with exactly two consent records |

**Browser test:** `node scripts/test-onboarding-live.mjs` creates a temporary confirmed test account (no signup email), signs in with real Supabase Auth, answers the actual browser flow, accepts both consents, clicks Enter HookZ, captures the real RPC response, reads the saved row/consents, refreshes and revisits onboarding. Its `finally` block removes only its generated account and records. Unrelated Express content is stubbed; Auth, own-profile reads, PostgREST save and PostgreSQL assertions are real. The Student branch ran live; Investor/Other ran against isolated PostgreSQL plus browser fixtures.

Files: migration 016, onboarding page response diagnostics, deployment checker, database regression check, live diagnostic and browser scripts. See [exact file manifest](files-changed.json).

**Task A complete — onboarding save works end-to-end.**

## Task B — landing theme propagation

The approved variables already existed in `index.css`; no second palette was introduced. The missing work was replacing legacy per-page classes, hardcoded banner colors and modal styles. Those usages now reference the existing variables directly, including shared controls and dialogs rendered outside the main React DOM wrapper.

| Token | Light | Dark |
| --- | --- | --- |
| Page / surface / soft | `#f7f7fb` / `#ffffff` / `#eeedf5` | `#121019` / `#1b1825` / `#262132` |
| Primary / secondary / muted text | `#201d32` / `#555168` / `#716c83` | `#f4f1fc` / `#c2bcd2` / `#a29ab6` |
| Border | `#e4e1ed` | `#363044` |
| Brand / hover / soft | `#7047eb` / `#5b32cf` / `#f0ebff` | `#a98aff` / `#bba3ff` / `#2b2046` |
| Accent / secondary | `#d5f478` / `#e8b8a2` | Same decorative accents, blended with surface |

Typography reuses Inter body and Inter Tight display; page headings use the landing's tight spacing (`-.045em`) and 28–38px product scale. Cards and primary/secondary buttons use 16px radii; dialogs use 24px; navigation uses 12px. Surfaces use existing subtle shadows, one-pixel borders and 16/24/32px spacing. Primary actions reuse the approved `btn-primary` gradient; secondary and ghost controls reuse existing button styles. Functional success/error indicators and image overlays retain their semantic treatment.

Changes include:
- Navbar wordmark and primary action, sidebar active states and mobile navigation.
- Home typography, card spacing, readable descriptions and action buttons, retaining the same sections/content/filtering.
- Projects' light/dark token-based banner, role cards and workspace dialogs; portal inputs now receive the same styles.
- Feed/filter states, Business, Profile cover/settings/edit fields, connections/messages and secondary product routes.
- Shared badges, empty states, search/AI dialogs, notifications, prototype/problem components, input states and shadows.

[Complete theme diff](task-b.patch) · [52 changed product files](files-changed.json) · [32 route/viewport/theme checks](theme-checks.json).

**Browser verified:** populated Home, Feed, Projects, Business, Problem Statements and Profile; connection and messaging empty states; project creation dialog and Edit Profile/settings. Each ran at **1440px and 375px, light and dark**. Extra checks cover profile/notification dropdowns, AI dialog and project-save toast at both widths/themes. Theme choice persists after reload. Exact card background/border/radius and primary-button gradient/radius are asserted. No horizontal overflow or uncaught page errors occurred.

Additional regression coverage: 18 secondary/public routes in desktop light/mobile dark, landing/auth at 1440/768/375 in both themes, and all three onboarding branches. Those route smoke checks validate rendering and overflow, not every business interaction or admin-only state.

Selected screenshots:
- [Home light](screenshots/home-1440-light.png) / [Home dark](screenshots/home-1440-dark.png) / [Home mobile](screenshots/home-375-light.png)
- [Projects](screenshots/projects-1440-light.png) / [workspace dialog](screenshots/project-dialog-1440-dark.png)
- [Feed](screenshots/feed-1440-light.png) / [Business](screenshots/business-1440-dark.png)
- [Profile](screenshots/profile-1440-light.png) / [settings](screenshots/settings-1440-dark.png)
- [Problem Statements](screenshots/opportunities-1440-light.png) / [AI dialog](screenshots/ai-dialog-375-dark.png)

Approved landing/auth sources and global tokens have **zero diff**. All 12 login/signup screenshots are byte-identical to the prior baseline. Landing screenshots retain the same layout; pixel differences are confined to the animated illustration and sparse rendering pixels. No landing styles/assets/motion were edited.

**Task B complete — landing theme fully propagated.**

## Task C — verify only

Opportunities remains Problem Statements only. The browser generated and expanded a statement, rejected a non-HTTP source URL, and asserted no job/internship marketplace controls. Its recovery diff changes theme classes only; the discovery implementation was not rebuilt.

The onboarding finale already imports the approved logo. Its file bytes match `client/public/logo-icon.png`; browser screenshots cover the finale in all three role branches. No logo replacement was needed.

**Task C complete — verification only, no out-of-scope changes.**

## Checks and delivery

[Check results](checks.txt) · [lint output](lint.txt). TypeScript/Vite build passes. Lint exits successfully with 342 warnings and no errors. No dependency added, frontend deployment performed, commit created or PR published.

Replay: `node scripts/test-onboarding.mjs`, `node scripts/test-onboarding-db.mjs`, `node scripts/test-product-theme.cjs`, `node scripts/test-product-theme.cjs --controls`, `node scripts/test-phase1-ui.cjs --recovery`. The live test is opt-in and requires configured test/deployment credentials; never paste those into reports.
