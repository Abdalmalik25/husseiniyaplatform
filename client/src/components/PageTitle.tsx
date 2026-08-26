import { useEffect } from "react";
import { useLocation } from "wouter";
import { resolvePageMeta } from "@/lib/pageTitles";

/**
 * PageTitle — إدارة الرأس لا عناوين الألسنة فقط — بل وصف الصفحة وCanonical وOpenGraph:
 *
 *  - الصفحات العامة (الزائر): عند مشاركة رابط بأي قناة (واتساب/فيسبوك/إكس)
 *    يظهر عنوان + وصف + صورة احترافيون بدل رابط مجرد بلا سياق.
 *  - المسارات التشغيلية المحمية: تحديث العنوان والوصف فقط — لا نحطّ canonical
 *    ولا نكشف روابط داخلية قد تنسرب للمشاركين الخارجيين.
 *  - الوظائف مساعدة أنشأ-إن-غاب حتى يعمل المكوّن مهما كانت حالة head الأولية.
 */
function ensureMeta(attr: "name" | "property", key: string): HTMLMetaElement {
  const selector = attr === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

function ensureCanonical(): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  return el;
}

export function PageTitle() {
  const [location] = useLocation();

  useEffect(() => {
    const meta = resolvePageMeta(location);
    document.title = meta.title;

    // Description يُحدَّث في كل الحالات — عنوان وواصف مفيدان في الألسنة
    // وفي التخزين المؤقت حتى للمسارات المحمية.
    ensureMeta("name", "description").setAttribute("content", meta.description);

    if (meta.canonical) {
      ensureCanonical().setAttribute("href", meta.canonical);
      ensureMeta("property", "og:title").setAttribute("content", meta.title);
      ensureMeta("property", "og:description").setAttribute("content", meta.description);
      ensureMeta("property", "og:url").setAttribute("content", meta.canonical);
      ensureMeta("property", "og:type").setAttribute("content", "website");
      ensureMeta("name", "twitter:title").setAttribute("content", meta.title);
      ensureMeta("name", "twitter:description").setAttribute("content", meta.description);
      // Public route → explicitly crawler-friendly (undo any leftover noindex).
      ensureMeta("name", "robots").setAttribute("content", "index, follow");
    } else {
      // Protected operational route → never let search engines index the page.
      // Complements robots.txt at the page level (belt-and-braces): the customer's
      // financial/site data and internal routes stay out of SERPs.
      ensureMeta("name", "robots").setAttribute("content", "noindex, nofollow");
    }
  }, [location]);

  return null;
}