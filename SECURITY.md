# Security Policy

## Supported Versions

Security fixes are handled for the current `main` branch after the project is published. Older snapshots, forks, and private deployments are not guaranteed to receive security updates.

## Reporting A Vulnerability

Please do not open a public issue for vulnerabilities that could expose user data, credentials, or deployment details.

Report security issues by contacting the maintainers through a private channel listed in the repository profile or by creating a minimal private advisory if the repository host supports it.

Include:

- Affected component: `backend/`, `frontend/`, deployment configuration, or documentation.
- Steps to reproduce.
- Expected impact.
- Any relevant logs or screenshots with secrets removed.

## Sensitive Data

This project may process private diary content and optional third-party credentials such as Google Calendar service account JSON. Never commit or disclose:

- PocketBase runtime data under `unotes_data/`.
- SQL exports, backups, or user-uploaded files.
- Google Calendar credentials, API keys, tokens, cookies, or production `.env` files.
- Real deployment URLs or internal IP addresses if they are not meant to be public.

If a credential is committed or exposed, rotate it at the provider immediately. Removing it from Git history is not enough.
