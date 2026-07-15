# frilance-os-frontend

React + Vite + TypeScript frontend for Frilance OS — see `CLAUDE.md` for
architecture/design-token rules before adding a screen. Design reference:
`design-tokens.json`, `DESIGN_SYSTEM.md`, and `dashboard.html` (kept in the
design-reference repo) — this app is the React port of that prototype.

Currently implemented: login (FR-01 only) and the Overview ("Огляд")
dashboard screen, wired to `frilance-os-backend`'s `/api/v1/dashboard/overview`.
Every other nav item in the sidebar/tab bar is a visual placeholder — see
`config/navItems/navItems.ts`.

## Requirements

- Node.js 20+ and npm

This was scaffolded without a local Node/npm available, so nothing here has
been installed, linted, or run yet. Before trusting it:

```bash
npm install
npm run lint
npm test
npm run build
```

## Running locally

```bash
cp .env.example .env.local   # VITE_API_BASE_URL defaults to localhost:8080/api/v1
npm install
npm run dev
```

Requires `frilance-os-backend` running locally (see that repo's README) —
log in with its seeded dev user `diana@example.com` / `password123`.

## Known simplifications (see CLAUDE.md for the full list)

- Only the Overview screen and FR-01 login are built; every other module in
  the sidebar is a disabled placeholder.
- The revenue chart's Тиждень/Рік range tabs only change the visual
  selection — the backend only serves the current month so far.
- Desktop and mobile share one `AttentionList` markup reflowed via CSS
  rather than the two structurally different card layouts in the original
  `dashboard.html` (which also showed a short category label on mobile that
  isn't in the current API response) — see CLAUDE.md "Deviations from the
  HTML reference".
