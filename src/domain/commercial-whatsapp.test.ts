import { afterEach, describe, expect, it } from "vitest";
import {
  CUSTOM_TEMPLATE_WHATSAPP_INTRO,
  commercialWhatsappUrl,
  customTemplateInquiryMessage,
  customTemplateRequestLinks,
} from "./commercial-whatsapp";

const ORIGINAL = process.env.ATAJOLAB_WHATSAPP_E164;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ATAJOLAB_WHATSAPP_E164;
  else process.env.ATAJOLAB_WHATSAPP_E164 = ORIGINAL;
});

describe("custom template commercial contact", () => {
  it("arma el mensaje con la profesión elegida", () => {
    expect(customTemplateInquiryMessage("Talleres mecánicos")).toBe(
      `${CUSTOM_TEMPLATE_WHATSAPP_INTRO} Talleres mecánicos`,
    );
  });

  it("no inventa un wa.me si falta el número", () => {
    delete process.env.ATAJOLAB_WHATSAPP_E164;
    expect(commercialWhatsappUrl("Hola")).toBeNull();
    expect(customTemplateRequestLinks().whatsapp).toBeNull();
    expect(customTemplateRequestLinks().mailto).toContain("mailto:");
  });

  it("genera wa.me cuando el número está configurado", () => {
    process.env.ATAJOLAB_WHATSAPP_E164 = "+54 9 11 5555-9999";
    const url = commercialWhatsappUrl(customTemplateInquiryMessage("Fotógrafos"));
    expect(url).toMatch(/^https:\/\/wa\.me\/5491155559999\?text=/);
    expect(decodeURIComponent(url!.split("text=")[1]!)).toContain("Fotógrafos");
  });
});
