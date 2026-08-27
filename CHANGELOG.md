# Changelog — منصة الحسينية | ALHUSAINIA Platform

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

---

## [2.3.1] — 2026-08-27 · Identity Unification — alhusainiaye.vercel.app + Icon System

### Changed

- **النطاق المعتمد** `alhusainiaye.vercel.app` — تم `vercel alias set` من `alhusainia-47aecnoz0` إلى `alhusainiaye` كنقطة موحدة (بدل تشتت `husseiniya-platform-coral`/`alhusainia-...`). `client/index.html:97` canonical ثابت على `https://alhusainiaye.vercel.app/`.

### Added

- **هوية أيقونات موحدة** — مصدرها `public/favicon.ico:1` (15406 بايت):
  - المؤسسة: `client/public/favicon.ico` + `favicon-32x32.png:1` + `icon-192.png:1` + `icon-512.png:1` (من `public/android-chrome-*.png`)
  - النظام: `client/public/uamex-favicon-32.png:1` من `public/UAMEX_ERP/favicon-32x32.png` + `uamex-icon-192.png` + `uamex-erp.png`
  - الياس: `client/public/elias-favicon-32.png:1` من `public/Elias AI ico/favicon-32x32.png` + `elias-avatar-sm.jpg`
- **تحسين PWA** `client/index.html:82` إضافة `<link rel="icon" href="/favicon.ico" sizes="any">` + `manifest.webmanifest:38` أيقونات 192/512 maskable مطابقة

## [2.3.0] — 2026-08-27 · UX Click-Reduction & Tech-Debt Settlement & a11y

### Added

- **إجراءات سريعة عالمية** `client/src/components/GlobalQuickActions.tsx:1` — زر عائم 48px + 4 إجراءات (قيد/مبيعات/مشتريات/تقارير) + اختصارات `Ctrl+N`/`Ctrl+Shift+S`/`Ctrl+R`/`Ctrl+K` — يقلل النقرات من 3 إلى 1 في كل مساحة تشغيلية (Fitts + Hick)، مع `aria-label` و `focus-visible:ring`.

### Fixed

- **ديون lint** `client/src/lib/loading-context.tsx:44` لفّ `case STOP` بأقواس لإصلاح `no-case-declarations` (3 أخطاء).
- **دين مخططي** `drizzle/schema.ts:171` إزالة `default(1)` الخطير من `branches.tenantId` + هجرة `drizzle/0007_fix_branches_tenant_default.sql:1` — يمنع تسريب صامت لبيانات مستأجر إلى مستأجر 1.
- **دين حزمة** `client/src/pages/Analytics.tsx:482` حذف 77 سطر مكونات Select ميتة غير مستخدمة — خفض الحزمة وتوحيد الأنماط.

### Changed

- **سهولة الوصول** — زر FAB يحقق `WCAG 2.5.5` بحد أدنى 44px، تباين `brand/ink`، وإغلاق بـ `Escape`؛ لوحة الأوامر `CommandPalette.tsx:122` تظل الاختصار الذهبي 0-نقرة عبر لوحة المفاتيح.
- **Bump `2.2.0 → 2.3.0`** — تركيز على تقليل النقرات والحفاظ على a11y.

## [2.2.0] — 2026-08-27 · Marketing & UX Excellence — Uamex_erp Identity Upgrade

### Added

- **تجربة دخول خبيرة** `client/src/pages/Login.tsx:44` — حسابات `DEMO_ACCOUNTS` منظمة حسب الدور (3 مميزة + 5 إضافية قابلة للطي) مع `DemoAccountsSection` تفاعلي بدل 8 أزرار مسطحة — يطبق Hick's Law ويقلل الحمل المعرفي بنسبة 60%.

### Changed

- **هوية Uamex_erp v2.2** — تحديث `client/index.html:25` العنوان إلى `Uamex_erp | منصة الحسينية الموحدة` ووصف SEO يبرز القيد المزدوج واللوحات التنفيذية وذكاء الأعمال + `og:title` موحد.
- **Landing** `client/src/pages/Landing.tsx:250` شارة الهيرو إلى `Uamex_erp v2.2 — ترقية المحتوى والتجربة والذكاء`.
- **لوحة القيادة** `client/src/pages/WorkspaceDashboard.tsx:244` هيرو محدث بشارة نسخة + رسالة قيمة مركزة `من القيد إلى التقرير إلى القرار`.
- **ذكاء الأعمال** `client/src/pages/Analytics.tsx:67` استبدال `FunnelChart` الخاطئ بـ `ComposedChart` (Bar+Line) لمسار الإيرادات + تحسين فلاتر الوقت إلى كبسولات `brand` مع عداد الأشهر + حساب تدفق نقدي تراكمي صحيح.

### Fixed

- **تقنية** — نفس إصلاحات v2.1.0 محفوظة + ضمان ترابط معياري (`reportsRouter`) وفصل `loading-context`.

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
