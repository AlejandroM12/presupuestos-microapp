import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getLegalPage, isLegalPageComplete, LEGAL_PAGES } from "@/content/legal";

export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = getLegalPage((await params).slug);
  if (!page) return {};
  // Mientras queden datos por completar la página no se indexa; completa, es indexable.
  return {
    title: page.title,
    description: page.summary,
    alternates: { canonical: `/legal/${page.slug}` },
    robots: { index: isLegalPageComplete(page) },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = getLegalPage((await params).slug);
  if (!page) notFound();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        {!isLegalPageComplete(page) && (
          <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Borrador pendiente de revisión legal. Los campos marcados con [COMPLETAR] requieren
            datos del titular.
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {page.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{page.summary}</p>
        {page.sections.map((s) => (
          <section key={s.heading} className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold text-ink">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="leading-relaxed text-foreground/90">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
