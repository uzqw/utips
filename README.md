# utips

A diary application repository with a PocketBase backend and a Vue frontend.

This repository is intentionally split by component because the backend and frontend use different licenses.

## Repository Layout

```text
.
├── backend/   # PocketBase backend, MIT License
├── frontend/  # Vue frontend based on KyleBing/diary, GPL-3.0
├── LICENSE.md
├── NOTICE.md
└── README.zh-CN.md
```

## Licensing

This is a multi-license repository:

| Path | License | Notes |
| --- | --- | --- |
| `backend/` | MIT | PocketBase-based backend implementation. See `backend/LICENSE`. |
| `frontend/` | GPL-3.0 | Based on `https://github.com/KyleBing/diary`. See `frontend/LICENSE`. |

Do not treat the whole repository as a single-license project. When redistributing or modifying a component, follow the license for that component.

## Features

- PocketBase-based authentication and data storage.
- Diary records, categories, notifications, and todo/calendar synchronization support.
- Vue 3 frontend adapted from the upstream diary project.
- Local-first deployment model with SQLite data under PocketBase `unotes_data/`.

## Backend Development

Requirements:

- Go 1.25 or later.

Run the backend:

```bash
cd backend
go mod download
go run . serve --http=0.0.0.0:17171 --dir=../unotes_data
```

Or from the repository root:

```bash
make backend-run
```

Build the backend:

```bash
make backend-build
```

PocketBase runtime data is stored in repo-root `unotes_data/` by default and is intentionally ignored by Git. This same directory is used by Docker and local backend runs for database compatibility.

## Frontend Development

Requirements:

- Node.js and npm compatible with the frontend toolchain.

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

Or from the repository root:

```bash
make frontend-dev
```

Build the frontend:

```bash
make frontend-build
```

The generated `frontend/dist/` directory is ignored by Git.

## Deployment

**Recommended deployment path: configure `.env`, then run `make docker-deploy`.**

```bash
cp .env.example .env
# Edit .env and fill in the required values.
make docker-deploy
```

After `.env` is complete, `make docker-deploy` is the only command you need for deployment. It pulls the published `uzqw/utips:latest` image and starts the all-in-one service with a restart policy. The service listens on `http://<server-ip>:17172` by default; change `DOCKER_HOST_PORT` in `.env` if you need a different host port. Runtime data is stored in the host directory configured by `DOCKER_UNOTES_DATA_PATH`, defaulting to repo-root `./unotes_data`.

## Project Governance

- Security policy: `SECURITY.md`.
- Contribution guide: `CONTRIBUTING.md`.
- Example environment file: `.env.example`.
- Frontend upstream notices: `frontend/NOTICE.md`.

## Security And Open-Source Hygiene

The repository intentionally excludes:

- PocketBase runtime data: `unotes_data/`.
- SQL exports and local archives.
- Google Calendar credentials and service account JSON files.
- Build outputs and dependency directories such as `dist/` and `node_modules/`.

Before publishing, rotate any credential that was ever committed to an old private history. Clearing Git history prevents future publication of old commits, but it does not invalidate leaked credentials.

## Chinese README

See `README.zh-CN.md` for the Chinese version.
