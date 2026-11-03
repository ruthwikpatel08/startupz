# Unified community feed

Implemented November 3, 2026. Local changes; not deployed.

## Design

- Updates, votable ideas, and working prototypes share one chronological timeline. Old pillar links still resolve to the same timeline and shared post anchors still scroll to their target.
- Removed the old three-way navigation and all category/ownership filters. Legacy database types remain compatible; ordinary post badges now say Update. The matching profile tab also says Updates.
- A compact composer offers three creation formats: Share an update, Test an idea, Show a prototype. Existing posting APIs, audience controls, prototype upload flow, comments, reactions and collaboration remain in use.
- Constrained reading width, clearer headings, muted metadata, restrained violet accents, and a contextual desktop sidebar. The sidebar disappears on smaller screens. Prototype headers wrap on narrow phones.
- AI Scout uses a shifting violet/blue gradient, slight lift and sparkle rotation on hover or keyboard focus. Reduced motion disables transitions and movement.

The layout applies [NNG's guidance on scannable headings and groups](https://www.nngroup.com/articles/layer-cake-pattern-scanning/) and [card grouping](https://www.nngroup.com/articles/cards-component/). The emphasis on feedback and collaboration is informed by [LinkedIn's community-focused feed work](https://www.linkedin.com/blog/engineering/feed/community-focused-feed-optimization). These are design principles, not evidence that this implementation improves engagement. No recommendation algorithm, artificial activity or new backend ranking was added.

## Implementation

- `client/src/pages/Feed/StartupFeedPage.tsx` and `.css`: mixed timeline, composer, layout and accessible action names.
- `client/src/components/prototypes/PrototypeCard.tsx`: shorter badge and narrow-screen header wrapping.
- `client/src/components/common/Navbar.tsx` and `client/src/product.css`: scoped Scout animation.
- `client/src/pages/Profile/ProfilePage.tsx`: one category-label replacement.
- `scripts/test-product-theme.cjs --feed`: repeatable regression check, reusing the existing Playwright setup.

## Evidence

`npm.cmd --prefix client run build`: exit 0; TypeScript and Vite successful, 2117 modules transformed.

`node scripts/test-product-theme.cjs --feed`: six PASS results, 1440 / 375 / 320 pixels, each light and dark:

> PASS mixed timeline, chronological order, audience, legacy links, publishing formats, both votes, likes, saves, share, comments, expansion, prototype modal and Scout motion

Checks include exclusion of a non-connection's private post, newest-first order, card/page overflow, banned UI labels, public idea and connections-only update payloads, prototype demo link, preserved shared-post URLs, UI runtime errors and reduced motion. Screenshot inspection led to correcting inherited sidebar padding/background and the narrow prototype header. Short text is no longer clamped unless its expansion control is available.

The checks use authenticated fixtures and intercepted API/Supabase responses. No production posts, votes or accounts were modified. They verify UI wiring and payloads, not live backend persistence or server-side authorization.

Targeted lint completed with exit 0 and existing unused-variable / React-hook warnings. A strict warning-as-error run failed on those warnings; it is not reported as a clean lint run. `git diff --check` passed.

Screenshots are in `screenshots/`: `preview-*` captures the viewport, `feed-*` captures the complete page, and `scout-hover-*` captures the animated button's hover state. Demo content and the illustrated map are test fixtures, not seeded application content.
