# ITUS Bank

A modern, full-stack online banking demo with an integrated AI assistant.
Built with **React** (frontend), **Spring Boot 3 + PostgreSQL** (backend),
and **Ollama / tinyllama** (AI).

The repo is organised as three self-contained components:

```
.
├── frontend/        React + nginx single-page app                 (see frontend/README.md)
├── backend/         Spring Boot 3 REST API + PostgreSQL access    (see backend/README.md)
├── ai/              Ollama image with the tinyllama model baked in (see ai/README.md)
├── docker-compose.yml   Orchestrates all four services (postgres, ai, backend, frontend)
└── README.md        ← you are here
```

## Features

- Register / login with JWT auth, bcrypt-hashed passwords
- Deposit, withdraw, transfer (with notes)
- Beneficiaries (saved recipients with nicknames)
- Bill payments (Electricity, Internet, Mobile, Water, Gas, DTH, Credit Card)
- Scheduled transfers (one-time / weekly / monthly with manual *Run Now*)
- Transaction history with type / date-range / text-search filtering and pagination
- Lifetime profile stats + avatar upload + KYC badge
- Spending insights with monthly bar chart, top-categories breakdown
- CSV statement download
- In-app notifications bell with unread badge
- Floating AI chat popup on every page (with full-screen `/chat` page too)
- Dark mode, responsive layout, toast notifications

## Prerequisites

- **Docker** 24+ with the Compose plugin (`docker compose ...`)
- ~3 GB free disk (tinyllama is ~640 MB, plus images and Postgres)
- Ports **3000**, **8082**, **5432**, **11436** free on the host

> First build downloads the Ollama image **and** pulls the tinyllama model
> at image-build time. Expect ~3–5 minutes for the first `docker compose build`;
> subsequent builds are cached.

## One-command deployment

```bash
# 1. Clone
git clone <your-repo-url> itus-bank
cd itus-bank

# 2. (Optional) override secrets via .env — defaults are fine for local dev
cat > .env <<'EOF'
DATABASE_USER=bankuser
DATABASE_PASSWORD=change-me-in-prod
DATABASE_NAME=bankappdb
JWT_SECRET=replace-with-a-256-bit-random-string-for-production
EOF

# 3. Build + run everything
docker compose up -d --build

# 4. Tail logs (Ctrl-C to stop tailing — containers keep running)
docker compose logs -f
```

Once everything is healthy:

| Service      | URL                                   | Notes                              |
|--------------|---------------------------------------|------------------------------------|
| Frontend     | http://localhost:3000                 | The user-facing app                |
| Backend API  | http://localhost:8082                 | Spring Boot REST API               |
| Health       | http://localhost:8082/actuator/health | Backend readiness probe            |
| Postgres     | localhost:5432                        | bankuser / bankpass123 (default)   |
| Ollama       | http://localhost:11436                | AI model API (proxied via backend) |

Open the frontend at **http://localhost:3000** and register a new user.
You start with ₹10,000 in your wallet.

## Common operations

```bash
# Stop everything (keeps volumes)
docker compose down

# Stop everything AND wipe the database + AI cache
docker compose down -v

# Rebuild a single service after code changes
docker compose up -d --build backend
docker compose up -d --build frontend

# Tail logs of a single service
docker compose logs -f backend

# Open a psql shell
docker exec -it bankapp-postgres psql -U bankuser -d bankappdb

# Check what model Ollama has
docker exec bankapp-ollama ollama list
```

## Architecture

```
            ┌─────────────────────────────────────────┐
            │  Browser  (http://localhost:3000)       │
            └────────────────────┬────────────────────┘
                                 │ /api/*
                       ┌─────────▼─────────┐
                       │  frontend (nginx) │  port 3000
                       │  serves React +   │
                       │  proxies /api → backend:8080
                       └─────────┬─────────┘
                                 │
                       ┌─────────▼─────────┐    ┌──────────────────┐
                       │  backend (Spring) │───►│  ai (ollama)     │ tinyllama
                       │  port 8080 (int)  │    │  port 11434 (int)│
                       │  port 8082 (host) │    └──────────────────┘
                       └─────────┬─────────┘
                                 │
                       ┌─────────▼─────────┐
                       │  postgres 16      │  port 5432
                       │  bankappdb        │
                       └───────────────────┘
```

## Working on a single component

Each component can be developed and run on its own — see the README inside each folder:

- [`frontend/README.md`](frontend/README.md) — React dev server, build, lint, structure
- [`backend/README.md`](backend/README.md) — Maven build, run locally, API reference, security
- [`ai/README.md`](ai/README.md) — Ollama model details, swapping the model, troubleshooting

## Demo credentials

After running once you can register your own user from the UI (you start with ₹10,000).
Or use this account if it already exists in your DB:

- **Username**: `testuser2`
- **Password**: `testpass123`

## Troubleshooting

| Symptom                                                    | Try                                                                |
|------------------------------------------------------------|--------------------------------------------------------------------|
| Port 3000 / 8082 / 5432 / 11436 in use                     | Stop the conflicting process or remap in `docker-compose.yml`      |
| Frontend shows stale UI after change                       | Hard-refresh: **Ctrl/Cmd + Shift + R**                             |
| `function lower(bytea) does not exist` after schema change | `docker compose down -v` to wipe Postgres and re-run               |
| AI chat returns "unavailable"                              | `docker exec bankapp-ollama ollama list` — confirm tinyllama present |
| Backend won't start (port conflict)                        | `docker compose logs backend` — look for `Tomcat started on port`  |

## License

Demo / educational. Not for real banking use.
