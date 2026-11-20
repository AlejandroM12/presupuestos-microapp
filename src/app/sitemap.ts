import type { MetadataRoute } from "next";
import { SEGMENTS } from "@/content/segments";
import { isLegalPageComplete, LEGAL_PAGES } from "@/content/legal";
import { siteConfig } from "@/lib/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/crear`, changeFrequency: "monthly", priority: 0.9 },
    ...SEGMENTS.map((s) => ({
      url: `${siteConfig.url}/para/${s.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Los textos legales entran al sitemap solo cuando están completos.
    ...LEGAL_PAGES.filter(isLegalPageComplete).map((p) => ({
      url: `${siteConfig.url}/legal/${p.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
