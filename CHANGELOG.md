# Changelog — منصة الحسينية | ALHUSAINIA Platform

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

---

## [2.1.0] — 2026-08-27 · Enterprise Integration & Production Release

### Added

- **`server/reportsRouter.ts`** — فصل معياري لتقارير الربحية (profitability) عن `modulesRouter` الضخم لخفض الترابط وتحسين قابلية الاختبار والصيانة (ISO 25010 maintainability).
- **`client/src/lib/loading-context.tsx`** — نظام تحكم موحّد بحالات التحميل (global + named + progress) مع `LoadingProvider` مدمج في `App.tsx` لتوحيد تجربة المستخدم عبر كل الوحدات.
- **`Cross-Origin-Opener-Policy` + `Cross-Origin-Resource-Policy`** في `vercel.json` لتعزيز عزل السياق ضد Spectre (defense-in-depth).

### Fixed

- **`server/modulesRouter.ts:1391`** — إزالة تصدير مكرر `export const modulesRouter` داخل نفس الراوتر كان يكسر `tsc --noEmit` و `esbuild` (C1 blocker). تم استعادة التركيب الصحيح `reports: reportsRouter`.
- **`server/modulesRouter.ts:1382-1387`** — تسريب بيانات عبر المستأجرين في `audit.list` (كان يفتقد `where tenantId`) — الآن مفلتر بـ `eq(activityLogs.tenantId, ctx.tenantId!)` (C5).
- **`server/modulesRouter.ts:1-48`** — استيرادات لجداول غير موجودة (`journals`, `journalLines`, `salesRepCommissions`…) كانت تفشل `pnpm check` — تم تنظيفها.
- **`client/src/lib/loading-context.tsx:136-147`** — أخطاء TypeScript في `useNamedLoading` بسبب fallback `{}` بدون index signature — تم الإصلاح بصب `Record<string,*>`.
- **`vercel.json:17`** — توحيد CSP مع Helmet: إضافة `https://*.neon.tech https://*.vercel.app` إلى `connect-src` + إضافة `worker-src` و `manifest-src` لدعم PWA/SW.
- **`server/_core/app.ts:178-192`** — معالج الأخطاء العام الآن يعيد `x-request-id` ويسجل بصيغة JSON منظمة مع `path/method` بدون تسريب stack في الإنتاج.
- **`server/_core/env.ts`** — تحقق fail-closed في الإنتاج: `JWT_SECRET` يجب أن يكون ≥32 حرفاً وإلا يفشل التشغيل فوراً؛ تحذيرات واضحة لـ `DATABASE_URL` و `BACKUP_ENCRYPTION_KEY`.

### Changed

- **Bump version `2.0.1 → 2.1.0`** — إصدار إنتاجي حقيقي مع تكامل معياري محكم.
- **`package.json`** bumped to `2.1.0`.

## [2.0.2] — 2026-08-27 · Brand Unification

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
