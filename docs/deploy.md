# utips open-source deployment guide

This guide covers the open-source runtime only: PocketBase backend, SQLite data directory, and Vue frontend. It avoids private production settings and does not require any real secrets.

## Project layout

```text
.
├── backend/          # Go + PocketBase backend
├── frontend/         # Vue 3 frontend
├── unotes_data/      # Runtime database directory; ignored by Git
├── compose.yaml      # Minimal Docker Compose runtime
├── compose.build.yaml# Optional local image build override
├── Dockerfile        # All-in-one frontend + backend image
└── .env.example      # Safe example environment variables
```

PocketBase normally defaults to `pb_data`, but this repository deliberately uses `unotes_data` to avoid colliding with other PocketBase-based projects. The open-source convention is:

- Docker: repo-root `./unotes_data` is mounted to container `/app/unotes_data`.
- Local backend: `backend` runs with `--dir=../unotes_data`, so it also uses repo-root `./unotes_data`.

This keeps one stable database location for Docker and local development.

## Database compatibility policy

The first public database format is the PocketBase-compatible `unotes_data` directory containing files such as `data.db`, `auxiliary.db`, optional `*-wal`/`*-shm` files, `storage/`, and `backups/`.

For future versions, keep the following rules so old user databases remain readable:

1. Treat repo-root `unotes_data/` as the canonical import/export directory.
2. Do not rename existing PocketBase collections or fields without an in-app compatibility migration.
3. Add new collections/fields in backend startup code or PocketBase migrations so old databases are upgraded in place.
4. Keep uploaded files under `unotes_data/storage/` together with `data.db`; do not copy only `data.db` when migrating.
5. Before upgrading a real deployment, stop the app and back up the whole `unotes_data/` directory.
6. If a deployment previously used `pb_data/` or `backend/pb_data/`, move or copy that whole directory to repo-root `unotes_data/` before using these docs. The directory name changes, but the SQLite files inside stay PocketBase-compatible.

Safe backup example:

```bash
cp -a unotes_data "unotes_data.backup.$(date +%Y%m%d-%H%M%S)"
```

## Port plan

All services bind to `0.0.0.0` by default so phones/tablets on the same LAN can access the host by its LAN IP. The default ports avoid common development and open-source app defaults:

- `17170`: frontend Vite dev server.
- `17171`: backend/PocketBase dev server.
- `17172`: all-in-one Docker service.

## Option A: Docker Compose

Requirements:

- Docker with Compose v2.

Start from the published image:

```bash
cp .env.example .env
# Optional on Linux: make Compose run as your host user.
printf "APP_UID=%s\nAPP_GID=%s\n" "$(id -u)" "$(id -g)" >> .env
mkdir -p unotes_data
docker compose up -d
```

Open:

- App and PocketBase API: `http://<server-ip>:17172`
- PocketBase Admin UI: `http://<server-ip>:17172/_/`

If you already have a database, stop the app and copy the full directory before starting:

```bash
docker compose down
rm -rf unotes_data
cp -a /path/to/old/pb_data ./unotes_data  # or copy an existing unotes_data directory
docker compose up -d
```

Build the image locally instead of pulling it:

```bash
cp .env.example .env
mkdir -p unotes_data
docker compose -f compose.yaml -f compose.build.yaml up --build
```

## Option B: Local backend and frontend

Requirements:

- Go 1.25 or later.
- Node.js/npm compatible with the frontend toolchain.

Terminal 1: start the backend on port `17171` using repo-root `unotes_data`:

```bash
mkdir -p unotes_data
make backend-run
```

Equivalent command:

```bash
cd backend
go run . serve --http=0.0.0.0:17171 --dir=../unotes_data
```

Terminal 2: start the frontend dev server on port `17170`:

```bash
cd frontend
npm install
npm run dev
```

Open:

- Frontend dev server: `http://<server-ip>:17170`
- Backend API: `http://<server-ip>:17171/api/`
- PocketBase Admin UI: `http://<server-ip>:17171/_/`

The Vite dev server proxies `/api` and `/api/files` to `0.0.0.0:17171`.

## Initial data and migrations

There is no committed production database or secret configuration. On first startup with an empty `unotes_data/`, the backend creates the required PocketBase collections and default categories when possible.

Current startup compatibility behavior lives in `backend/main.go`:

- creates missing `categories`, `diaries`, `files`, `notifications`, and `todo_calendar_events` structures;
- adds missing Google Calendar and todo sync fields to existing collections;
- preserves existing records in an imported `unotes_data/` directory.

If future schema changes are needed, add forward-compatible startup checks or PocketBase migrations before changing frontend code that depends on the new schema.

## Environment variables

`.env.example` contains only safe deployment knobs:

- `DOCKER_IMAGE`: Docker image to run.
- `DOCKER_CONTAINER_NAME`: local container name.
- `DOCKER_HOST_PORT`: host port mapped to container port `17172`.
- `APP_UID` / `APP_GID`: Linux host user/group ids used for writable bind mounts.
- `DOCKER_UNOTES_DATA_PATH`: host path for the persistent PocketBase data directory.
- `TZ`: runtime timezone.

If you see `attempt to write a readonly database`, the host `unotes_data/` directory or copied SQLite files are not writable by the container user. Set `APP_UID=$(id -u)` and `APP_GID=$(id -g)` in `.env`, then ensure the directory is owned by that user.

Do not commit `.env`, real credentials, service account JSON, SQL exports, backups, or production database files.
