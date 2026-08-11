# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue containing credentials, personal data, or a reproducible exploit.

Use GitHub's private vulnerability-reporting flow for this repository when it is available. If it is not available, contact [@KevPH2026](https://github.com/KevPH2026) through GitHub and share only the minimum information needed to establish a secure reporting channel.

## Secrets and generated artifacts

The repository must never contain:

- extension signing keys or other private keys;
- API keys, Telegram tokens, or local environment files;
- local SQLite databases, captures, or session data;
- generated CRX or ZIP extension packages.

Use `.env.example` for configuration names only. Keep real values and generated artifacts outside version control.

## Maintainer response

Reports are triaged for impact and reproducibility. Where practical, maintainers will acknowledge a valid report, prepare a fix, and publish a coordinated disclosure after affected users have had a reasonable opportunity to update.

## Deployment guidance

Self-hosted deployments are responsible for their own endpoint security, access controls, backups, retention settings, and compliance obligations. Do not expose a development endpoint to the public internet without authentication and appropriate transport security.
