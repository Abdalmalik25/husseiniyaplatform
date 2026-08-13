# دليل النشر والاستضافة — ALHUSAINIA

دليل شامل لأفضل خيارات استضافة قاعدة البيانات ونشر منصة الحسينية لخدمات الأعمال، مع خطوات عملية لكل مزود.

---

## 1. استضافة قاعدة البيانات (MySQL)

### 🏆 الخيار الأفضل: PlanetScale (مجاني للبدء)
- **لماذا؟** قاعدة بيانات MySQL سحابية بمعايير إنتاجية، خطة مجانية سخية (1GB)، نسخ احتياطي تلقائي، واتصال آمن.
- **الخطوات**:
  1. أنشئ حساباً على [planetscale.com](https://planetscale.com)
  2. أنشئ قاعدة بيانات جديدة باسم `alhusainia`
  3. اختر منطقة قريبة (Middle East / EU)
  4. من تبويب **Connect** انسخ رابط الاتصال بصيغة:
     ```
     mysql://USER:PASSWORD@HOST:PORT/alhusainia
     ```
  5. ضع الرابط في متغير `DATABASE_URL`

### الخيار الثاني: **Railway** (سريع وسهل)
- **لماذا**: نشر قاعدة بيانات MySQL بنقرة واحدة مع SSL تلقائي ونسخ احتياطي.
- **الخطوات**:
  1. سجّل في [railway.app](https://railway.app)
  2. اضغط **New Project** ← **Provision MySQL**
  3. انسخ `DATABASE_URL` من تبويب Variables
  4. الصقه في إعدادات المنصة

### الخيار الثالث: **Aiven** (احترافي)
- **لماذا**: إدارة كاملة لقاعدة البيانات مع مراقبة وتنبيهات، خطة مجانية 1GB.
- **الخطوات**:
  1. سجّل في [aiven.io](https://aiven.io)
  2. أنشئ خدمة MySQL
  3. انسخ رابط الاتصال من تبويب Overview

### الخيار الرابع: **Clever Cloud** (أوروبي)
- **لماذا**: خيار ممتاز للخصوصية والامتثال الأوروبي، دعم عربي جيد.
- **الخطوات**:
  1. سجّل في [clever-cloud.com](https://clever-cloud.com)
  2. أنشئ إضافة MySQL
  3. انسخ `MYSQL_ADDON_URI`

### الخيار الخامس: **خادم VPS ذاتي** (تحكم كامل)
- **لماذا**: تحكم كامل في الخادم والأداء، مناسب للمشاريع الكبيرة.
- **الخطوات**:
  1. استأجر VPS من DigitalOcean / Hetzner / OVH
  2. ثبّت MySQL:
     ```bash
     sudo apt update && sudo apt install mysql-server -y
     sudo mysql_secure_installation
     ```
  3. أنشئ قاعدة بيانات ومستخدم:
     ```sql
     CREATE DATABASE alhusainia;
     CREATE USER 'alhusainia'@'%' IDENTIFIED BY 'STRONG_PASSWORD';
     GRANT ALL PRIVILEGES ON alhusainia.* TO 'alhusainia'@'%';
     FLUSH PRIVILEGES;
     ```
  4. رابط الاتصال:
     ```
     mysql://alhusainia:STRONG_PASSWORD@SERVER_IP:3306/alhusainia
     ```

---

## 2. نشر المنصة (التطبيق)

### الخيار الأول: **Vercel** (الأسهل والأسرع)
- **لماذا**: نشر تلقائي من GitHub، CDN عالمي، HTTPS مجاني، وواجهة عربية.
- **الخطوات**:
  1. ارفع المشروع إلى GitHub
  2. سجّل في [vercel.com](https://vercel.com)
  3. اضغط **New Project** ← استورد المستودع
  4. أضف متغيرات البيئة:
     ```
     DATABASE_URL=mysql://...
     OAUTH_SERVER_URL=...
     APP_ID=...
     COOKIE_SECRET=...
     ```
  5. اضغط **Deploy** — سيتم النشر تلقائياً

### الخيار الثاني: **Railway** (نشر كامل + قاعدة بيانات)
- **لماذا**: نشر التطبيق وقاعدة البيانات في مكان واحد.
- **الخطوات**:
  1. من [railway.app](https://railway.app) اضغط **New Project**
  2. اختر **Deploy from GitHub** واربط المستودع
  3. أضف متغيرات البيئة من تبويب Variables
  4. Railway سيكتشف `package.json` تلقائياً ويشغّل `npm run build` ثم `npm start`

### الخيار الثالث: **Render** (نشر خادم كامل)
- **الخطوات**:
  1. سجّل في [render.com](https://render.com)
  2. اضغط **New** ← **Web Service**
  3. اربط مستودع GitHub
  4. Build Command: `npm run build`
  5. Start Command: `npm start`
  6. أضف متغيرات البيئة

### الخيار الرابع: **Docker + VPS** (تحكم كامل)
- **لماذا**: أفضل خيار للمشاريع الكبيرة مع تحكم كامل في البنية.
- **الخطوات**:
  1. أنشئ ملف `Dockerfile` في جذر المشروع
  2. ارفع المشروع إلى VPS
  3. شغّل:
     ```bash
     docker build -t alhusainia .
     docker run -d -p 3000:3000 --env-file .env alhusainia
     ```

### الخيار الخامس: **Cloudflare Pages + Workers** (أسرع شبكة)
- **لماذا**: شبكة Cloudflare العالمية مع حماية DDoS مجانية.
- **الخطوات**:
  1. اربط مستودع GitHub بـ [pages.cloudflare.com](https://pages.cloudflare.com)
  2. Build Command: `npm run build`
  3. Output Directory: `dist/public`
  4. أضف متغيرات البيئة

---

## 3) متغيرات البيئة المطلوبة

```env
# قاعدة البيانات
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/alhusainia

# المصادقة
OAUTH_SERVER_URL=https://your-oauth-server.com
APP_ID=your-app-id
COOKIE_SECRET=your-secret-key

# الدفع (اختياري)
PAYMENT_MODE=disabled
STRIPE_SECRET_KEY=sk_live_...

# الهوية
VITE_BRAND_ARABIC_NAME=الحسينية
VITE_BRAND_COMMERCIAL_NAME=ALHUSAINIA
VITE_BRAND_LEGAL_NAME=مؤسسة الحسينية لخدمات الأعمال
VITE_BRAND_ENGLISH_NAME=ALHUSAINIA Business Services Establishment
VITE_BRAND_TAGLINE=شريكك المهني لخدمات الأعمال المتكاملة
```

---

## 4) مقارنة سريعة

| المزود | قاعدة البيانات | النشر | مجاني للبدء | سهولة | مناسب لـ |
|---|---|---|---|---|---|
| **Supabase** | ✅ MySQL | ❌ | ✅ | ⭐⭐⭐⭐⭐ | المشاريع الصغيرة والمتوسطة |
| **Railway** | ✅ MySQL | ✅ | ✅ | ⭐⭐⭐⭐⭐ | الحل المتكامل |
| **Vercel** | ❌ | ✅ | ✅ | ⭐⭐⭐⭐⭐ | الواجهة الأمامية |
| **Render** | ✅ MySQL | ✅ | ✅ | ⭐⭐⭐⭐ | المشاريع المتوسطة |
| **Clever** | ✅ MySQL | ✅ | ✅ | ⭐⭐⭐⭐ | الخصوصية الأوروبية |
| **VPS + Docker** | ✅ | ✅ | ❌ | ⭐⭐⭐ | المشاريع الكبيرة |

---

## 5) خطوات الإطلاق النهائية

1. **اختر مزود قاعدة البيانات** — ننصح بـ Railway أو Supabase
2. **أنشئ قاعدة البيانات** وانسخ `DATABASE_URL`
3. **ارفع المشروع إلى GitHub**
4. **اربط GitHub بمزود النشر** (Vercel أو Railway)
5. **أضف متغيرات البيئة** من القسم 3
6. **شغّل ترحيل قاعدة البيانات**:
   ```bash
   npm run db:push
   ```
7. **انشر** واختبر الموقع
8. **أضف نطاقك الخاص** (مثل alhusainia.com) من إعدادات المزود

---

## 6) نصائح إضافية

- **النسخ الاحتياطي**: فعّل النسخ الاحتياطي التلقائي من مزود قاعدة البيانات
- **المراقبة**: استخدم [UptimeRobot](https://uptimerobot.com) لمراقبة الموقع مجاناً
- **الأمان**: غيّر `COOKIE_SECRET` إلى قيمة عشوائية قوية
- **السرعة**: استخدم Cloudflare CDN أمام الموقع
- **التحليلات**: أضف Google Analytics أو Umami لتحليل الزوار