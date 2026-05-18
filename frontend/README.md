# utips Frontend

Vue frontend for `utips`.

## Upstream And License

This frontend is based on KyleBing's `diary` project:

- Upstream: https://github.com/KyleBing/diary
- License: GPL-3.0
- Local license file: `LICENSE`

Because this component is derived from a GPL-3.0 project, redistribution and derivative works of `frontend/` must comply with GPL-3.0.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The generated `dist/` directory is not committed.

## Runtime Configuration

Project-level UI defaults are in `src/projectConfig.ts`. Keep deployment-specific secrets and credentials out of source control.
