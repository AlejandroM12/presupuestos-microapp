import type { Metadata } from "next";
import { QuoteEditor, type EditorCloud } from "@/components/quote/quote-editor";
import { getCurrentUser } from "@/server/auth/session";
import { isUuid } from "@/server/api";
import { loadEntitlements } from "@/server/pro";
import { getBusinessProfile } from "@/services/business-profile";
import { listCustomers } from "@/services/customers";
import { getQuote, NotFoundError } from "@/services/quotes";

export const metadata: Metadata = {
  title: "Crear presupuesto",
  description:
    "Armá un presupuesto profesional con cálculo automático y vista previa, sin registrarte.",
  alternates: { canonical: "/crear" },
};

export default async function CrearPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; template?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  let cloud: EditorCloud | undefined;
  if (user) {
    const [entitlements, profile] = await Promise.all([
      loadEntitlements(user.id),
      getBusinessProfile(user.id),
    ]);
    const customers = entitlements.cloudFeatures
      ? (await listCustomers(user.id)).map((c) => ({
          id: c.id,
          name: c.name,
          company: c.company,
          email: c.email,
          phone: c.phone,
          address: c.address,
          taxId: c.taxId,
        }))
      : [];

    let quote: Awaited<ReturnType<typeof getQuote>> | null = null;
    let notFound = false;
    if (sp.id) {
      try {
        if (!isUuid(sp.id)) throw new NotFoundError("Presupuesto");
        quote = await getQuote(user.id, sp.id);
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
        notFound = true;
      }
    }

    cloud = {
      quoteId: quote?.id ?? null,
      draft: quote?.draft ?? null,
      customerId: quote?.customerId ?? null,
      profile: profile
        ? {
            businessName: profile.businessName,
            professionalName: profile.professionalName,
            logo: profile.logo,
            email: profile.email,
            phone: profile.phone,
            whatsapp: profile.whatsapp,
            address: profile.address,
            taxId: profile.taxId,
            website: profile.website,
            accentColor: profile.accentColor,
            defaultCurrency: profile.defaultCurrency,
            defaultValidityDays: profile.defaultValidityDays,
            defaultPaymentTerms: profile.defaultPaymentTerms,
            defaultTerms: profile.defaultTerms,
          }
        : null,
      customers,
      templateId: sp.template ?? null,
      notFound,
    };
  } else if (sp.template) {
    cloud = {
      quoteId: null,
      draft: null,
      customerId: null,
      profile: null,
      customers: [],
      templateId: sp.template,
      notFound: false,
    };
  }

  return <QuoteEditor key={cloud?.quoteId ?? "nuevo"} cloud={cloud} />;
}
