# frilance-os-frontend — engineering guide

React port of the Frilance OS design (design-tokens.json, DESIGN_SYSTEM.md,
dashboard.html — kept in the design-reference repo), talking to
`frilance-os-backend`. Read this before adding a screen or component; the
"Adding a new module" section at the bottom is the checklist to follow.

## Current state

Implemented: login (FR-01) and the Overview dashboard screen, end to end
against the real backend API. Every other sidebar/tab-bar nav item
(`config/navItems/navItems.ts`) is a disabled placeholder with no route —
do not wire a nav item to a route until the page behind it actually exists.

## Design tokens — never hardcode a color, spacing value, or font

`theme/tokens.css` is design-tokens.json's `base`/`dark`/`light` sets ported
1:1 to CSS custom properties, using **the same variable names** as the
original `dashboard.html` prototype (`--ink-900`, `--brand-400`, `--sp-5`,
etc.) — this is deliberate: if you're porting a piece of the HTML reference
into a new component, the CSS variable names don't change, only the syntax
around them does.

- Every color, spacing, radius, font, and shadow value in a component's CSS
  must be a `var(--...)` reference into `tokens.css`. If a value you need
  isn't there, add it to `tokens.css` (matching `design-tokens.json`'s
  structure) rather than inlining a hex code or px value in a component
  file — a hardcoded color in component CSS cannot be re-themed and is a
  review-blocking issue here, not a style nit.
- Light is the default; it's applied via `body.light-theme`, toggled by
  `ThemeProvider`/`useTheme` (`theme/ThemeProvider.tsx`) — the base
  (no-class) token set in `tokens.css` is still the dark palette, `.light-theme`
  is just applied on mount by default now instead of only after a user
  opts in. Never branch in
  JS/TSX on the current theme to pick a color — that's what the CSS
  variables are for. The only legitimate JS-level theme awareness is
  `ThemeToggleButton`'s icon swap, and that's driven by a `:global(body.light-theme)`
  CSS selector, not a conditional render.
- FR-22: theme choice persists to `localStorage` per device, not synced
  server-side. Don't add a backend call for this without re-reading FR-22.

## Component structure — Atomic Design

`src/` is organized by atomic-design level, one flat folder per level, and
inside each level every component gets its own subfolder holding its
`.tsx`/`.ts`, `.module.css`, and `.test` files together (e.g.
`organisms/RevenueHero/RevenueHero.tsx`, `RevenueHero.module.css`, and its
private `chartPath.ts`/`chartPath.test.ts` helper all live in
`organisms/RevenueHero/`). A component's folder is decided by composition,
not by which screen it happens to appear on first:

- `atoms/`: indivisible elements with no sub-components (`Chip/`, `icons/`,
  `ThemeToggleButton/`). An atom never imports from `molecules/`,
  `organisms/`, `templates/`, or `pages/`.
- `molecules/`: small groups of atoms wired into one functional unit
  (`Panel/`, `MobileTabBar/`). A molecule may import atoms and `config/`, but
  not organisms/templates/pages.
- `organisms/`: compositions of atoms/molecules forming a distinct,
  self-contained interface section (`Sidebar/`, `Topbar/`, `MobileHeader/`,
  and every dashboard panel: `RevenueHero/`, `AttentionList/`,
  `ContentPlanStrip/`, `FinanceStrip/`, `TeamWorkload/`, `EventLedger/`).
  An organism may import atoms and molecules, never a template or page.
- `templates/`: page layout only — arranges organisms into the app's
  structural chrome without owning real content (`AppShell/`, which renders
  an `<Outlet/>` for whatever the router gives it). A template may import
  organisms, molecules, and atoms; nothing feature-specific belongs here.
- `pages/`: a template's slot filled with real data (`DashboardPage/`,
  `LoginPage/`). A page owns its data-fetching hook
  (`DashboardPage/useDashboardOverview.ts`) and composes organisms — nothing
  in `pages/` should be imported by another page. If two pages want to
  share a component, promote it down to the appropriate
  `organisms/`/`molecules/`/`atoms/` folder instead of importing across
  page files.
- `config/`: shared non-component data consumed across levels
  (`navItems/navItems.ts` — read by both the `Sidebar` organism and the
  `MobileTabBar` molecule). Not itself a level in the hierarchy.
- `guards/`: cross-cutting, non-visual concerns that don't fit the visual
  pyramid (`RequireAuth/`, a router-level auth wrapper). Deliberately kept
  out of atoms→pages rather than forced into one.

### Rules for Claude

1. **Never skip levels**: an atom's file never imports an organism, and a
   template never reaches past its organisms into another page's internals.
   Do not nest an organism directly inside an atom.
2. **Presentational components**: atoms and molecules stay presentational —
   data in via props, events out via callbacks. Neither should call a hook
   that fetches data.
3. **Design tokens**: every value (color/spacing/radius/font/shadow) comes
   from `theme/tokens.css` — see below. This applies at every level, not
   just atoms.
4. **Reusability check**: before adding a new organism, check `molecules/`
   (and `atoms/`) for something composable instead of duplicating markup.

- Every component's styles live in a co-located `*.module.css` (CSS
  Modules). No global class names outside `theme/global.css` and
  `theme/tokens.css` — those two files are the only places selectors are
  allowed to reference `body`/`:root` directly (via `:global(...)` where
  needed, e.g. `ThemeToggleButton.module.css` reacting to `body.light-theme`).

## Responsive strategy — read this before building a new screen

The original `dashboard.html` prototype deliberately duplicates the entire
DOM into two parallel shells (`.shell` desktop / `.m-shell` mobile) toggled
by a media query — DESIGN_SYSTEM.md section 10 explains why that was the
right call *for a static HTML prototype*, but also explicitly flags that a
real component-based implementation should collapse this into conditional
rendering. This app takes that recommendation:

- **Structural nav chrome** (sidebar+topbar vs. header+bottom-tab-bar) is
  genuinely two different DOM trees — that split uses `useMediaQuery` in
  `AppShell` to render one or the other. This is the *only* place in the
  app that should branch on viewport in JS.
- **Page content** (everything under `pages/`, and every future page) is
  one component per screen, styled to reflow with CSS media
  queries at the same `900px` breakpoint (`@media (min-width: 900px)` — see
  `EventLedger/EventLedger.module.css` for the fullest example: a `<table>` and a
  `<ul>` stacked-row rendering both exist in the DOM, and CSS `display:
  none`s the one that doesn't apply). Don't add a second React component
  (`FooMobile.tsx`) for a screen that could instead reflow via CSS — that's
  exactly the duplication DESIGN_SYSTEM.md 10 says the production version
  should avoid.

### Deviations from the HTML reference

`AttentionList` uses one shared markup (vertical card: severity dot, title,
subtitle, meta) that reflows between a mobile horizontal scroll row and a
desktop vertical stack via `flex-direction`. The original prototype's
desktop `.attn-item` is actually a different, plainer horizontal row (dot +
title/subtitle + trailing meta, no card boundaries), and its mobile
`.m-attn-card` shows an extra short category label (e.g. "Лід мовчить") that
isn't in the current API response (`DashboardOverviewResponse.AttentionItemDto`
has no such field). This was a deliberate scope trade-off to keep one
component per the rule above rather than pixel-match two different original
layouts — if exact fidelity to both variants becomes a real requirement,
that's a sign this one *should* become the exception with two render paths,
not a bug to silently "fix" by adding a label field nobody asked for.

## Data fetching conventions

- All HTTP calls go through `api/client.ts`'s `apiRequest` — it injects the
  bearer token and normalizes errors into `ApiError`. Don't call `fetch`
  directly from a component or feature hook.
- Each API resource gets its own module in `api/` (`api/auth.ts`,
  `api/dashboard.ts`) exporting typed functions and the response/request
  interfaces. **Keep these types in sync with the backend's DTOs by hand** —
  there's no shared schema/codegen yet; if you change a field on
  `DashboardOverviewResponse` in the backend, update `api/dashboard.ts`'s
  matching interface in the same change.
- Reads go through TanStack Query (`useQuery`, see
  `pages/DashboardPage/useDashboardOverview.ts`) — one hook per page, named
  `use<Page>`. Don't call the API module directly from a component; go
  through the hook so caching/retry/loading state stay consistent.
- Writes (once a page needs them) should use `useMutation` and invalidate
  the relevant query key on success — there are no mutations yet, so there's
  no established pattern to copy; look at TanStack Query's own docs for the
  mutation API rather than improvising one.

## Auth

- `hooks/useAuth.ts` holds the access token in `localStorage` (mirrors the
  backend's single-token simplification — see backend CLAUDE.md). No
  refresh flow. `guards/RequireAuth/RequireAuth.tsx` redirects to `/login` when
  there's no token; it does not verify the token is still valid (an expired
  token will fail the first API call and the user sees the error state, not
  an automatic redirect) — wire that up together with refresh-token support
  on the backend, not as a frontend-only patch.
- `pages/LoginPage/LoginPage.tsx` only implements FR-01 (freelancer login).
  There's no agency-role picker (FR-02) yet.

## Testing

- Vitest + React Testing Library. Test files live in the same component
  folder as what they test (`RevenueHero/chartPath.test.ts`,
  `AttentionList/AttentionList.test.tsx`) — no separate `__tests__` tree.
- Pure logic (`chartPath.ts`) gets plain Vitest unit tests with concrete
  input/output assertions, not snapshot tests.
- Components get RTL render tests that assert on visible text/roles a user
  would actually see (`screen.getByText`, `getByRole`) — not on
  implementation details like internal state or CSS module class names.
- A new page isn't done until: at least one test per non-trivial pure
  function it introduces, and one render test per component proving both
  its populated and empty states (see `AttentionList.test.tsx` for the
  pattern) — most panels here have a meaningful empty state
  (`FinanceStrip`'s "no access" row, `EventLedger`'s "no events yet") and
  that's exactly the kind of thing a render-only manual check tends to skip.

## Adding a new module (e.g. Clients next)

1. Reread the FR(s) in the SRS this module implements, including
   role-based visibility rules — RBAC decisions (who sees what) should be
   enforced server-side (see backend CLAUDE.md), but the frontend still
   needs to render "no access" states gracefully rather than assuming every
   field is always present.
2. Add `api/<module>.ts` with typed request/response interfaces mirroring
   the backend's DTOs, and functions going through `apiRequest`.
3. Add whatever `organisms/<Name>/` folders (and `molecules/`/`atoms/` if
   new primitives are needed) the module's sections require, following the
   panel/empty-state patterns already in `organisms/`. Then add
   `pages/<Module>Page/use<Module>.ts` (TanStack Query hook) and
   `pages/<Module>Page/<Module>Page.tsx` composing those organisms.
4. Add the route in `router.tsx` and flip the corresponding entry in
   `config/navItems/navItems.ts` from a placeholder (no `path`) to a real one.
5. Style with `tokens.css` variables only; reflow responsively via CSS
   media queries at 900px rather than branching in JS (see "Responsive
   strategy" above).
6. Tests per the Testing section.
