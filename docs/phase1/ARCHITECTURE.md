# HookZ Phase 1 architecture audit

Audited 28 October 2026, before implementation. See README.md for implementation, patches, and validation.

- `client/src/main.tsx` mounts React; `App.tsx` owns routing, lazy loading, shared navigation, and access gates.
- `client/src/pages/` contains public marketing, authentication, onboarding, student networking, projects, startup tools, messaging, profile, admin, and legal pages. Two dashboard implementations are present but are not routed; `/dashboard` redirects to `/feed`.
- `client/src/components/common/` contains Avatar, badges, Modal, Navbar, Sidebar, mobile navigation, Footer, notifications, search entry points, consent, empty states, and feature dialogs. Buttons, cards, and inputs use CSS classes, not separate component APIs. Tabs and toast messages are local to feature pages.
- `client/src/components/{auth,ai,problems,prototypes,effects,search}/` contains specialized UI. Existing feature behavior is preserved.
- `client/tailwind.config.js` and `client/src/index.css` define the shared visual system. Previously, hardcoded indigo/slate colors, embedded landing styles, inline onboarding styles, and global font overrides conflicted. Phase 1 replaces that with shared light/dark tokens.
- `ThemeContext.tsx` persists `startupz_theme` and toggles the root `dark` class; light is the default. The original theme control lived in Navbar; Settings links to profile editing. Phase 1 also exposes the theme switch there.
- `AuthContext.tsx` owns Supabase sessions, cached application user state, password/username login fallback, and Express synchronization. No replacement auth provider was introduced.
- `client/src/lib/supabase.ts` maps Supabase users/profiles and implements profile/data helpers; `services/api.ts` accesses Express and manages its existing cache/fallback behavior.
- Registration and the Google callback both previously collected profile/role details. The old onboarding grouped questions, requested a second password, and issued independent consent/profile/password requests. Phase 1 removes these duplicate screens.
- `server/src/index.js` mounts Express routes; `routes/` covers auth, users, connections, messages, meetings, projects, posts, startups, opportunities, investors, mentors, problems, saved items, notifications, search, upload, AI, administration, verification, reports, consent, and DSAR. `middleware/` handles authentication and rate limits; `config/` handles JWT configuration; `utils/` integrates AI.
- `server/prisma/schema.prisma` models the legacy application database. `server/src/supabase.js` provides service-role Supabase operations. Seed and curated fallback data live in `server/src/{seedData,realData}` and `client/src/data`.
- `supabase/migrations/` defines PostgreSQL schema, auth triggers, RLS, persistence, and consent records. Existing frontend references to `onboarding_completed` had no tracked migration. The approved Phase 1 migration adds completion/answer fields and an authenticated transactional RPC.
- Tests live in `scripts/` and `server/test-*.js`. Existing security changes were uncommitted when this task began and were preserved. New checks cover onboarding rules, PostgreSQL behavior, responsive rendering, and mocked browser journeys; live provider/deployment checks remain separate.

## Route map

| Paths | Screen / behavior |
| --- | --- |
| `/` | Public landing when signed out; existing builder home when signed in |
| `/login`, `/register` | Login and initial account creation |
| `/auth/callback` | Resolve Supabase session and route to onboarding or home |
| `/forgot-password`, `/reset-password` | Existing password recovery |
| `/onboarding` | Full-screen role-based setup; completed members redirect home |
| `/feed`, `/projects`, `/business` | Community feed, projects, business tools |
| `/cofounders`, `/students` | Connections directory; students redirects to its student filter |
| `/startups`, `/startups/:id`, `/startups/create` | Startup directory, detail, protected creation |
| `/opportunities`, `/investors`, `/mentors`, `/failed-startups` | Existing directories |
| `/problems`, `/problems/:id` | Problem discovery and detail |
| `/profile`, `/profile/:id` | Own protected profile / public member profile; `?edit=true` opens settings/editor |
| `/network`, `/messages`, `/saved` | Protected connections, chat, saved items |
| `/search`, `/memberships` | Search and memberships |
| `/meeting/:roomCode` | Protected meeting room |
| `/admin`, `/admin/problems`, `/admin/problems/create`, `/admin/problems/:id/edit` | Protected admin tooling |
| `/privacy`, `/privacy-notice`, `/terms`, `/dsar`, `/data-rights` | Legal pages and aliases |
| `/dashboard`, unmatched paths | Feed redirect / 404 |

## New onboarding data flow

Supabase signup/Google auth → profile with `onboarding_completed=false` → one-question React state → profile preview and explicit consent → `complete_onboarding` RPC → PostgreSQL validation + profile/role/consent transaction → mapped local user → home.

The RPC derives ownership from `auth.uid()`, accepts only Student/Investor/Other, ignores fields outside the selected branch, locks only the current profile, and returns the existing record on retry. A failure rolls back every write. Existing members are preserved by the migration; completed profile state takes precedence over stale signup metadata.
