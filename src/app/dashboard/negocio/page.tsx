import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/ui";
import { BusinessForm, type BusinessValues } from "@/components/dashboard/business-form";
import { requireUser } from "@/server/auth/session";
import { getBusinessProfile } from "@/services/business-profile";

export const metadata: Metadata = { title: "Mi negocio", robots: { index: false } };

export default async function BusinessPage() {
  const user = await requireUser("/dashboard/negocio");
  const p = await getBusinessProfile(user.id);
  const initial: BusinessValues = {
    businessName: p?.businessName ?? "",
    professionalName: p?.professionalName ?? "",
    logo: p?.logo ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    whatsapp: p?.whatsapp ?? "",
    address: p?.address ?? "",
    taxId: p?.taxId ?? "",
    website: p?.website ?? "",
    accentColor: p?.accentColor ?? "",
    defaultCurrency: p?.defaultCurrency ?? "ARS",
    defaultValidityDays: p?.defaultValidityDays ?? 15,
    defaultPaymentTerms: p?.defaultPaymentTerms ?? "",
    defaultTerms: p?.defaultTerms ?? "",
  };
  return (
    <>
      <PageHeader
        title="Mi negocio"
        description="Estos datos se precargan en cada presupuesto nuevo que armes con tu cuenta."
      />
      <BusinessForm initial={initial} />
    </>
  );
}
