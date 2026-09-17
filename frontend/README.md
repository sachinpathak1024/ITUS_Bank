# ITUS Bank — Frontend

React 18 single-page app served by nginx in production. Talks to the backend
via the `/api` prefix, which nginx proxies to the backend container.

## Stack

- **React 18** + React Router 6
- **Axios** (with an auth interceptor + 401 auto-logout)
- **Inter** font, custom CSS design system with light + dark themes
- **nginx** in the production image (no extra runtime dependencies)

No CSS framework: there's a CSS-variable-based design system in `src/App.css`
and per-page CSS.

## Local development...

```bash
cd frontend
npm install
npm start                    # http://localhost:3000 (with hot reload)
```

When running `npm start`, the dev server runs on port 3000. To talk to a
backend running on `localhost:8082`, add a proxy line to `package.json`:

```json
"proxy": "http://localhost:8082"
```

…or run the whole stack with Docker Compose from the repo root.

## Project structure

```
frontend/
├── public/
│   └── index.html              Loads Inter + #root mount point
├── src/
│   ├── App.jsx                 Routes + provider tree (Theme + Toast)
│   ├── App.css                 Design system (CSS variables, light + dark)
│   ├── index.jsx / index.css   Entry + reset
│   ├── api.js                  Axios instance with auth interceptor
│   ├── utils.js                Currency / date formatters, helpers
│   ├── components/
│   │   ├── Layout.jsx          Sidebar + topbar shell for authed pages
│   │   ├── Theme.jsx           Light/dark theme context
│   │   ├── Toast.jsx           Toast notifications (success/error/info)
│   │   ├── PrivateRoute.jsx    Auth-gated route wrapper
│   │   ├── FloatingChat.jsx    Bottom-right AI chat popup
│   │   └── NotificationBell.jsx Topbar bell + dropdown
│   └── pages/
│       ├── Login.jsx           Auth — split hero/form layout
│       ├── Register.jsx        Auth — same layout, different copy
│       ├── Dashboard.jsx       Balance card + quick actions + recent activity
│       ├── Transactions.jsx    Filtered, paginated transaction table
│       ├── Transfer.jsx        Send money (saved beneficiary or username)
│       ├── Deposit.jsx         Deposit form with quick-amount chips
│       ├── Withdraw.jsx        Withdraw form (balance-aware)
│       ├── Beneficiaries.jsx   Add / list / delete saved recipients
│       ├── Bills.jsx           Category grid → biller picker → pay
│       ├── Scheduled.jsx       One-time / weekly / monthly transfers
│       ├── Insights.jsx        Monthly bar chart + category breakdown + CSV
│       ├── Profile.jsx         Profile, avatar upload, change password, stats
│       └── Chat.jsx            Full-page AI chat
```

## Routing

| Path             | Element        | Guard         |
|------------------|----------------|---------------|
| `/login`         | `Login`        | public        |
| `/register`      | `Register`     | public        |
| `/dashboard`     | `Dashboard`    | PrivateRoute  |
| `/transactions`  | `Transactions` | PrivateRoute  |
| `/transfer`      | `Transfer`     | PrivateRoute  |
| `/deposit`       | `Deposit`      | PrivateRoute  |
| `/withdraw`      | `Withdraw`     | PrivateRoute  |
| `/beneficiaries` | `Beneficiaries`| PrivateRoute  |
| `/bills`         | `Bills`        | PrivateRoute  |
| `/scheduled`     | `Scheduled`    | PrivateRoute  |
| `/insights`      | `Insights`     | PrivateRoute  |
| `/profile`       | `Profile`      | PrivateRoute  |
| `/chat`          | `Chat`         | PrivateRoute  |

All authed routes are rendered inside `<Layout />` which provides the
sidebar, topbar (welcome + theme toggle + notification bell + avatar),
and the floating AI chat.

## Auth

- After login or register the JWT is stored in `localStorage.token`,
  and the user object in `localStorage.user`.
- `api.js` adds `Authorization: Bearer <token>` to every request.
- A 401 response wipes localStorage and bounces the user to `/login`.

## Theme

`Theme.jsx` exposes `useTheme()` with `{ theme, toggle }`. The current
theme is applied via the `[data-theme="dark"]` attribute on
`<html>` and persisted in `localStorage.itus-theme`.

## Build

```bash
npm run build
# Output goes to frontend/build/. The Docker image (nginx:alpine)
# copies that into /usr/share/nginx/html.
```

## Production image

```bash
docker build -t itus-frontend .
docker run -p 3000:3000 itus-frontend
```

(Used by Compose at the repo root.)

## nginx configuration

`nginx.conf` does two things:

1. Serves the built SPA, falling back to `/index.html` for client-side routes.
2. Proxies `/api/*` to `http://backend:8080` (the backend service in the
   compose network).

## Adding a new page

1. Create `src/pages/MyPage.jsx`
2. Import it and add a `<Route>` in `src/App.jsx`
3. Add an entry to the `NAV` array in `src/components/Layout.jsx`

## Linting / formatting

Default Create-React-App ESLint config (no Prettier). Run via the
dev server warnings or `npm test -- --watchAll=false` for CI-style runs.
