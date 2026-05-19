# utips

A diary application repository with a PocketBase backend and a Vue frontend.

This repository is intentionally split by component because the backend and frontend use different licenses.

[![中文文档](https://img.shields.io/badge/docs-%E4%B8%AD%E6%96%87-0F766E?style=flat-square)](./README.zh-CN.md)

<div align="center">
  <img src="docs/screenshots/utips-screenshot-main.png" width="600">
  <p><i>Figure 1: Main interface of utips</i></p>
</div>

## Deployment

**Recommended: fill in `.env`, then run `make docker-deploy`.**

```bash
cp .env.example .env
# Edit .env and fill in the required values.
make docker-deploy
```

After `.env` is complete, `make docker-deploy` is the only deployment command you need. The service listens on `http://<server-ip>:17172` by default.

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

## Development

Requirements:

- Backend: Go 1.25 or later.
- Frontend: Node.js and npm compatible with the frontend toolchain.

Run from the repository root:

```bash
make backend-dev
make frontend-dev
```

Build from the repository root:

```bash
make backend-build
make frontend-build
```

PocketBase runtime data is stored in repo-root `unotes_data/` by default and is intentionally ignored by Git. The generated `frontend/dist/` directory is also ignored by Git.

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

## Licensing

This is a multi-license repository:

| Path | License | Notes |
| --- | --- | --- |
| `backend/` | MIT | PocketBase-based backend implementation. See `backend/LICENSE`. |
| `frontend/` | GPL-3.0 | Based on `https://github.com/KyleBing/diary`. See `frontend/LICENSE`. |

Do not treat the whole repository as a single-license project. When redistributing or modifying a component, follow the license for that component.
