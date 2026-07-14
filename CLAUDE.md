# frilance-os-frontend — engineering guide

React port of the Frilance OS design (design-tokens.json, DESIGN_SYSTEM.md,
dashboard.html — kept in the design-reference repo), talking to
`frilance-os-backend`. Read this before adding a screen or component; the
"Adding a new module" section at the bottom is the checklist to follow.

## Current state

Implemented: login (FR-01) and the Overview dashboard screen, end to end
against the real backend API. Every other sidebar/tab-bar nav item
(`components/shell/navItems.ts`) is a disabled placeholder with no route —
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
- Dark is the default; light is applied via `body.light-theme`, toggled by
  `ThemeProvider`/`useTheme` (`theme/ThemeProvider.tsx`). Never branch in
  JS/TSX on the current theme to pick a color — that's what the CSS
  variables are for. The only legitimate JS-level theme awareness is
  `ThemeToggleButton`'s icon swap, and that's driven by a `:global(body.light-theme)`
  CSS selector, not a conditional render.
- FR-22: theme choice persists to `localStorage` per device, not synced
  server-side. Don't add a backend call for this without re-reading FR-22.

## Component structure

- `components/ui/`: small, domain-agnostic primitives with no knowledge of
  any specific feature (`Panel`, `Chip`). If a component needs to know what
  a "client" or a "post" is, it doesn't belong in `ui/`.
- `components/shell/`: the app chrome (sidebar, topbar, mobile header/tab
  bar, theme toggle, nav config). Nothing feature-specific belongs here
  either — `AppShell` renders an `<Outlet/>` for whatever the router gives it.
- `components/auth/`: cross-cutting auth guards (`RequireAuth`).
- `features/<name>/`: one folder per screen/module (`features/dashboard/`,
  `features/auth/`). A feature folder owns its page component, its
  sub-components, its data-fetching hook, and its CSS — nothing in
  `features/` should be imported by another feature. If two features want
  to share a component, promote it to `components/ui/` instead of importing
  across feature folders.
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
- **Page content** (everything in `features/dashboard/`, and every future
  feature) is one component per screen, styled to reflow with CSS media
  queries at the same `900px` breakpoint (`@media (min-width: 900px)` — see
  `EventLedger.module.css` for the fullest example: a `<table>` and a
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
  `features/dashboard/useDashboardOverview.ts`) — one hook per feature,
  named `use<Feature>`. Don't call the API module directly from a component;
  go through the hook so caching/retry/loading state stay consistent.
- Writes (once a feature needs them) should use `useMutation` and invalidate
  the relevant query key on success — there are no mutations yet, so there's
  no established pattern to copy; look at TanStack Query's own docs for the
  mutation API rather than improvising one.

## Auth

- `hooks/useAuth.ts` holds the access token in `localStorage` (mirrors the
  backend's single-token simplification — see backend CLAUDE.md). No
  refresh flow. `components/auth/RequireAuth.tsx` redirects to `/login` when
  there's no token; it does not verify the token is still valid (an expired
  token will fail the first API call and the user sees the error state, not
  an automatic redirect) — wire that up together with refresh-token support
  on the backend, not as a frontend-only patch.
- `features/auth/LoginPage.tsx` only implements FR-01 (freelancer login).
  There's no agency-role picker (FR-02) yet.

## Testing

- Vitest + React Testing Library. Test files live next to what they test
  (`ChartPath.test.ts`, `AttentionList.test.tsx`) — no separate `__tests__`
  tree.
- Pure logic (`chartPath.ts`) gets plain Vitest unit tests with concrete
  input/output assertions, not snapshot tests.
- Components get RTL render tests that assert on visible text/roles a user
  would actually see (`screen.getByText`, `getByRole`) — not on
  implementation details like internal state or CSS module class names.
- A new feature isn't done until: at least one test per non-trivial pure
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
3. Add `features/<module>/use<Module>.ts` (TanStack Query hook) and
   `features/<module>/<Module>Page.tsx` plus whatever sub-components/CSS
   modules it needs, following the panel/empty-state patterns in
   `features/dashboard/`.
4. Add the route in `router.tsx` and flip the corresponding entry in
   `components/shell/navItems.ts` from a placeholder (no `path`) to a real
   one.
5. Style with `tokens.css` variables only; reflow responsively via CSS
   media queries at 900px rather than branching in JS (see "Responsive
   strategy" above).
6. Tests per the Testing section.
