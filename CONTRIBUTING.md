# Contributing

Thanks for considering a contribution to `utips`.

## License Boundaries

This repository uses different licenses by directory:

- `backend/`: MIT License.
- `frontend/`: GPL-3.0, derived from KyleBing's `diary` project.

By contributing to a directory, you agree that your contribution is provided under that directory's license. Do not move code between `frontend/` and `backend/` unless the license impact is explicit and acceptable.

## Development Setup

Backend:

```bash
cd backend
go mod download
go run . serve --http=0.0.0.0:17171 --dir=../unotes_data
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Contribution Rules

- Keep commits in English.
- Do not commit secrets, production data, SQL dumps, logs, archives, build outputs, or dependency directories.
- Keep deployment-specific settings out of source control. Use `.env.example` as documentation only.
- Prefer small, focused changes with clear behavior changes.
- Update `README.md` and `README.zh-CN.md` when setup, configuration, or behavior changes.
- Add or update tests when changing backend behavior.

## Before Submitting

Run at least:

```bash
cd backend
GOCACHE=/tmp/utips-gocache go test ./...
```

For frontend changes, run the relevant build or type-check command available in `frontend/package.json`.

## Security Issues

Do not report security vulnerabilities in public issues. Follow `SECURITY.md`.
