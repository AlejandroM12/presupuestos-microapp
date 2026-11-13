import { describe, expect, it } from "vitest";
import { defaultQuote } from "./defaults";
import { applyProfile, type ProfileDefaults } from "./profile";

const profile: ProfileDefaults = {
  businessName: "Electro Sur",
  professionalName: "Marcos",
  logo: "",
  email: "info@electrosur.com",
  phone: "",
  whatsapp: "+54 9 11 5555-1234",
  address: "",
  taxId: "20-12345678-9",
  website: "",
  accentColor: "#0f766e",
  defaultCurrency: "USD",
  defaultValidityDays: 30,
  defaultPaymentTerms: "50% al aprobar",
  defaultTerms: "No incluye materiales",
};

describe("applyProfile", () => {
  it("precarga emisor y preferencias en un presupuesto nuevo", () => {
    const q = applyProfile(defaultQuote(), profile);
    expect(q.issuer.businessName).toBe("Electro Sur");
    expect(q.issuer.whatsapp).toBe("+54 9 11 5555-1234");
    expect(q.currency).toBe("USD");
    expect(q.validityDays).toBe(30);
    expect(q.paymentTerms).toBe("50% al aprobar");
    expect(q.terms).toBe("No incluye materiales");
    expect(q.accentColor).toBe("#0f766e");
  });

  it("no pisa textos que la persona ya escribió", () => {
    const draft = { ...defaultQuote(), paymentTerms: "Contado", terms: "Mis condiciones" };
    const q = applyProfile(draft, profile);
    expect(q.paymentTerms).toBe("Contado");
    expect(q.terms).toBe("Mis condiciones");
  });

  it("no modifica el cliente ni los conceptos", () => {
    const draft = defaultQuote();
    draft.customer.name = "Laura";
    const q = applyProfile(draft, profile);
    expect(q.customer.name).toBe("Laura");
    expect(q.items).toEqual(draft.items);
  });
});
