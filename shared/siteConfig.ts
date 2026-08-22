import { brand } from "@/lib/brand";

export const siteConfig = {
  brand: brand.names,
  app: {
    name: "ALHUSAINIA — منظومة الأعمال الموحّدة",
    description:
      "منظومة الحسينية الموحّدة — محاسبة متقدمة، استشارات هندسية، عمليات تجارية، ومكتبة حديثة في منصة سحابية واحدة متعددة العملات والفروع.",
    downloadUrl: "#download",
    shareText: "جرّب ALHUSAINIA — منظومة الأعمال الموحّدة للمؤسسات والفروع.",
  },
  features: brand.stats.map((stat, i) => {
    // Map stats values to feature-like descriptions
    return stat.label;
  }),
  stats: brand.stats,
  pillars: brand.pillars,
  testimonials: brand.testimonials,
  contact: brand.contact,
};
