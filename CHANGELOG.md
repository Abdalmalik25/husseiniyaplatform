# Changelog — منصة الحسينية | ALHUSAINIA Platform

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

---

## [2.0.2] — 2026-08 Unreleased · Brand Unification

### Changed
- **Unified system name to `Uamex_erp`** across all marketing screens, work surfaces (login, landing, footer, boot splash), page titles, and reference documentation.
- **Official `Uamex_erp` logo** (`uamex-erp.png` / `uamex-favicon-32.png`) adopted across the boot splash, login gate, footer, landing UAMEX identity, and as a branded favicon.
- Internal identifiers, storage keys, and CSV/upgrade filenames intentionally left unchanged for backward compatibility.
## [2.0.1] — 2026-08-24 · Production Hardening Release

### Fixed
- **`api/agent.mjs`**: invalid syntax `.orderBy(activityLogs.createdAt desc)` broke parsing of the whole agent function — now uses `desc()` from drizzle-orm.
- **`api/agent.mjs`**: `purge-stale` reported hardcoded zeros; it now counts rows before deletion and returns real numbers.
- **Serverless functions crash (`FUNCTION_INVOCATION_FAILED`)**: `api/cron.mjs` / `api/agent.mjs` imported `.ts` modules directly, which the Vercel Node runtime cannot load from plain `.mjs` handlers — both functions were uncallable in production. Converted them to first-class TypeScript functions (`api/cron.ts`, `api/agent.ts`) so Vercel compiles them natively; route rewrites are extension-less and remain valid.

### Security
- **`api/cron.mjs`**: fail-closed in production when `CRON_SECRET` is not configured (previously accepted the well-known default `"dev-cron"`).
- **`vercel.json`**: added `Strict-Transport-Security` (HSTS, 2 years, includeSubDomains) on all static responses.

### Changed
- **`package.json`**: added `engines.node >=20` so Vercel always provisions the correct runtime.

## [2.0.0] — 2026-08-24 · Technical Debt Settlement

### Fixed
- **Build pipeline**: replaced the broken esbuild CLI `--alias:@shared=./shared` call (fails on Windows) with a Node-API builder (`scripts/build-server.cjs`).
- **React runtime crash risk**: fixed `rules-of-hooks` violations in `BasicData`, `Branches`, `Customization`, `Permissions` (early return before hooks → hook-count mismatch on permission change).
- **Postbuild migrations** no longer fail Vercel builds when `DATABASE_URL` is absent (graceful skip).

### Security
- Removed hardcoded Neon PostgreSQL credentials from 11 root-level operational scripts; they now read `process.env.DATABASE_URL` and exit with a clear error if missing.

### Quality
- ESLint errors reduced **419 → 0** (Node globals for operational scripts, removed deprecated `--ext`, fixed duplicate case labels, useless assignments, empty blocks, escape issues).
- CI now enforces lint and provides the full environment (DB/JWT/OAuth) to test & build jobs.
- TypeScript target raised ES2015 → ES2022; health endpoint reports version 2.0.0.

---
