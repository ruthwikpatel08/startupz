# HookZ stack

Verified from package manifests on 28 October 2026. These are declared ranges, not a dependency upgrade proposal.

| Layer | Existing technology |
| --- | --- |
| Frontend | React / React DOM `^19.2.8`, TypeScript `~6.0.2`, Vite `^8.3.0` |
| Routing | React Router `^7.18.4` |
| Styling | Tailwind `^3.4.19`, PostCSS, Autoprefixer, CSS tokens |
| Icons | Lucide React `^1.48.0` |
| State/data | React Context, existing API/profile caches; no Zustand or React Query installed |
| Auth/data client | Supabase JS `^2.117.2`, Zod `^4.6.5` |
| API | Express `^4.21.2`, CORS, Multer, dotenv |
| Persistence | Prisma / Prisma Client `^5.22.0`, PostgreSQL `pg ^8.13.1`, Supabase |
| Legacy authentication | bcryptjs `^2.4.3`, jsonwebtoken `^9.0.2` |
| AI | `@google/genai ^2.24.0` |
| Checks | TypeScript/Vite build, Oxlint, existing Node scripts; installed Playwright for UI checks |

Phase 1 adds no application dependency and changes no package manifest or lockfile. It uses CSS motion, IntersectionObserver, native dialog, native progress, native datalist, and existing Lucide/Avatar components. Inter Tight is loaded alongside the existing Inter font through the existing Google Fonts connection, with system fallbacks.

For isolated database validation only, PGlite was installed under ignored `node_modules/.hookz-validation`. It is not imported by the app or server. The test script includes the one-time installation command.

Existing configuration remains: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_API_BASE_URL`, server Supabase service credentials/database connection, and existing JWT/server settings. No secret values are included in this report.
