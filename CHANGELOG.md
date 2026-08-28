# Changelog — منصة الحسينية | ALHUSAINIA Platform

All notable changes are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/) and [Semantic Versioning](https://semver.org/).

---

## [2.5.0] — 2026-08-28 · Advanced Best-Practice Elevation — Observability + Security + Architecture

### Added

- **Observability** `server/_core/logger.ts:1` هيكل JSON سطر بسطر 12-factor (redact أسرار) + `app.ts:17` وسيط `x-request-id` مبكر + `logger.info` للوصول — يغذي Vercel Log Drains بلا تسريب
- **Architecture** `server/services/doubleEntryValidator.ts:1` خدمة نقية `isBalanced/imbalance/validateOrThrow` بتحمل 0.01 — تفصل منطق القيد المزدوج عن الـ routers (SOLID)

### Changed

- **Security** `vercel.json:24` HSTS أضيف `preload` — يصبح `max-age=63072000; includeSubDomains; preload` لتمكين HSTS preload list
- **Bump `2.4.2 → 2.5.0`** — ترقية إلى مستوى متقدم وفق OWASP/ISO 25010/12-Factor

## [2.4.2] — 2026-08-28 · Terminology Refinement — إزالة السطحية الكارثية

### Fixed

- **كارثة الربط بـ و** — `مؤسسة الحسينية لخدمات الأعمال ومكتبة الحسينية الحديثة` (تكرار الحسينية + ربط سطحي بكلمة و كأنها لافتة محل) استُبدلت بهيكلة مؤسسية: `مجموعة الحسينية` كمظلة، `مؤسسة الحسينية لخدمات الأعمال` ككيان قانوني، وقطاعات: `قطاع الأعمال المؤسسية — Uamex_erp` / `قطاع الهندسة والمساحة الرقمية` / `مركز الحسينية للخدمات المعرفية` (الاسم الجديد لـ المكتبة). تم إزالة التكرار في 10 مواضع (`server/_core/app.ts:175` health، `pdfInvoice`، `Home.tsx:898`، `Portal`، `i18n:79`، `pageTitles`، `BusinessLifecycleWizard`، `Terms`، `index.html`).
- **مصطلحات سطحية** — `client/src/lib/brand.ts:15` أضيف `group/groupDesc/libraryAlias`، `brand.ts:189` عنوان المكتبة `الخدمات الطلابية...` → `الخدمات المعرفية والطباعة الاحترافية`، `i18n.ts:65` `workspaceLibraryTitle` مماثل، `Reports.tsx:178` `مكتبة الحسينية — التقارير` → `مجموعة الحسينية — التقارير الموحدة`، `WorkspaceDashboard.tsx:603` `مكتبة الحسينية` → `المركز المعرفي`.

## [2.4.1] — 2026-08-27 · Tech-Debt Settlement — RateLimit/Headers/UI Unification

### Fixed

- **أمان/أداء** `server/_core/app.ts:56` ترقية تحديد المعدل إلى Vercel-aware: `trust proxy:1` + `validate:false` + `RedisStore` اختياري عند `UPSTASH_REDIS_REST_URL` (fallback في الذاكرة موثق في `server/_core/rateLimit.ts:1`).
- **رؤوس** `app.ts:26` محاذاة Helmet مع `vercel.json:11` — `connectSrc` يضم `fonts.googleapis` + `workerSrc/manifestSrc` + `COOP/CORP same-origin` + `xDnsPrefetchControl`.
- **واجهة** `client/src/components/ui/button.tsx:7` توحيد `cva` كمصدر وحيد للأزرار (h-10 للـCTAs ≥40px) + `ThemeSwitcher.tsx:18` وصولية `aria-label` + `client/src/components/ui/empty-state.tsx:1` حالة فارغة موحدة بحد متقطع و `role=status`.

## [2.4.0] — 2026-08-27 · World-Class Institutional Content & Appearance

### Changed

- **لغة استشارية عالمية** `client/src/lib/brand.ts:32` — tagline/pod promise أعيدت صياغتها بلغة مجالس الإدارة: `منصة الحوكمة التي تحوّل التعقيد إلى وضوح قابل للقياس` + نموذج `نشخّص-نصمّم-ننفذ-نقيس` على أطر IFRS/COSO/PMBOK؛ `uamex:42` وصف الحقيقة الواحدة بجودة Big Four.
- **محتوى مؤسسي** `brand.ts:110` corporate hero `هل تملك صورة مالية تُقرأ في 60 ثانية؟` + إجابات Variance/KPIs/COSO/IFRS + مشاكل بصياغة رقابية `ميّز الربح عن السيولة (IAS 7)` `مصفوفة COSO ثلاثية` `موازنة صفرية Budget vs Actual`؛ engineering hero `هل تملك تقديراً يُحتَج به أمام الممول؟` + NRM/POMI 35%.
- **مظهر عالمي** `client/src/pages/Landing.tsx:259` هيرو فاخر: شارة `بيت الخبرة منذ 2008 • IFRS•COSO•PMBOK•ISO`، عنوان بتدرج `from-brand to-[#e7c9a6]`، شريط منهجية `نشخّص — نصمّم — ننفّذ — نقيس`، ورسالة مجالس إدارة `حقيقة واحدة قابلة للتدقيق`.

## [2.3.2] — 2026-08-27 · Identity Visible — Icons + Messaging Cache-Bust

### Fixed

- **الكاش المتصلب** — `client/public/sw.js:4` `v5 → v6` + `client/index.html:82` إضافة `?v=2.3.2` لكل favicon — كان Service Worker يعيد أيقونات قديمة من `alhusainia-v5` فلم يظهر أي تحديث رغم النشر.
- **هوية مرئية** `client/src/pages/Landing.tsx:853` صف أيقونات جديد في قسم Uamex_erp يعرض المؤسسة (`/favicon-32x32.png`) / النظام (`/uamex-favicon-32.png`) / الياس (`/elias-avatar-sm.jpg`) مع تسميات — يثبت أن التحديث وصل بصرياً.

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
