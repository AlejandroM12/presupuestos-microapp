import type { QuoteDraft } from "./schema";

export interface ProfileDefaults {
  businessName: string;
  professionalName: string;
  logo: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  taxId: string;
  website: string;
  accentColor: string;
  defaultCurrency: "ARS" | "USD";
  defaultValidityDays: number;
  defaultPaymentTerms: string;
  defaultTerms: string;
}

/** Precarga un presupuesto nuevo con los datos y preferencias guardados del negocio. */
export function applyProfile(draft: QuoteDraft, profile: ProfileDefaults): QuoteDraft {
  return {
    ...draft,
    currency: profile.defaultCurrency,
    validityDays: profile.defaultValidityDays,
    paymentTerms: draft.paymentTerms || profile.defaultPaymentTerms,
    terms: draft.terms || profile.defaultTerms,
    accentColor: draft.accentColor || profile.accentColor,
    issuer: {
      ...draft.issuer,
      businessName: profile.businessName,
      professionalName: profile.professionalName,
      logo: profile.logo,
      email: profile.email,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      address: profile.address,
      taxId: profile.taxId,
      website: profile.website,
    },
  };
}
