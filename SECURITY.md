# Security Policy

## Supported Versions

The latest release on `main` receives security updates.

## Reporting a Vulnerability

Please report vulnerabilities through GitHub Security Advisories or contact the maintainers privately before opening a public issue.

## Secrets

- Never commit tokens to the repository.
- Use GitHub Actions secrets for `NPM_TOKEN`.
- The workflows rely on the built-in `GITHUB_TOKEN` for GitHub Releases, Pages, and GitHub Packages.
