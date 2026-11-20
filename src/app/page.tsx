import { Audience } from "@/components/marketing/audience";
import { Benefits } from "@/components/marketing/benefits";
import { CustomTemplates } from "@/components/marketing/custom-templates";
import { Examples } from "@/components/marketing/examples";
import { Faq, faqItems } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TemplatesShowcase } from "@/components/marketing/templates-showcase";
import { TrackEvent } from "@/components/analytics/track-event";
import { salesOpen } from "@/lib/config/sales";
import { siteConfig } from "@/lib/config/site";

// El CTA de WhatsApp depende de variables de entorno: se evalúa en cada solicitud, no en el build.
export const dynamic = "force-dynamic";

function buildJsonLd(items: ReturnType<typeof faqItems>) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "es-AR",
      description: siteConfig.tagline,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    },
  ];
}

export default function Home() {
  const items = faqItems(salesOpen());
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <TrackEvent name="landing_view" />
        <Hero />
        <HowItWorks />
        <Examples />
        <TemplatesShowcase />
        <Benefits />
        <Audience />
        <Pricing />
        <Faq items={items} />
        <CustomTemplates />
        <FinalCta />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(items)).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
