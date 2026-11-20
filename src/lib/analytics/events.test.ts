import { describe, expect, it } from "vitest";
import {
  ANALYTICS_EVENTS,
  parseAttribution,
  sanitizeParams,
  toGa4,
  toMeta,
  toTikTok,
} from "./events";

describe("lista blanca de parámetros", () => {
  it("descarta todo lo que no esté permitido (contenidos, datos de clientes, pagos)", () => {
    const out = sanitizeParams({
      location: "hero",
      value: 9900,
      currency: "ARS",
      customer_name: "María Pérez",
      email: "a@b.com",
      items: "Concepto",
      card: "4111111111111111",
      total: "123456.00",
      first: true,
    } as never);
    expect(out).toEqual({ location: "hero", value: 9900, currency: "ARS", first: true });
  });

  it("descarta emails o textos largos aunque estén en un parámetro permitido", () => {
    expect(sanitizeParams({ content_name: "maria@correo.com" })).toEqual({});
    expect(sanitizeParams({ content_name: "x".repeat(200) })).toEqual({});
    expect(sanitizeParams({ value: Number.NaN })).toEqual({});
  });
});

describe("atribución UTM", () => {
  it("lee UTM válidos y los normaliza", () => {
    expect(
      parseAttribution(
        "?utm_source=Instagram&utm_medium=paid_social&utm_campaign=lanzamiento_01&fbclid=abc",
      ),
    ).toEqual({
      utm_source: "instagram",
      utm_medium: "paid_social",
      utm_campaign: "lanzamiento_01",
    });
  });

  it("ignora valores sospechosos o demasiado largos", () => {
    expect(parseAttribution("?utm_source=<script>alert(1)</script>")).toEqual({});
    expect(parseAttribution(`?utm_campaign=${"a".repeat(80)}`)).toEqual({});
    expect(parseAttribution("")).toEqual({});
  });
});

describe("traducción por plataforma", () => {
  it("cada evento tiene equivalente en Meta, TikTok y GA4", () => {
    for (const e of ANALYTICS_EVENTS) {
      expect(toMeta(e, {}).name).toBeTruthy();
      expect(toTikTok(e, {}).name).toBeTruthy();
      expect(toGa4(e, {}).name).toBeTruthy();
    }
  });

  it("usa los eventos estándar de conversión de cada plataforma", () => {
    expect(toMeta("sign_up", {}).name).toBe("CompleteRegistration");
    expect(toMeta("checkout_start", {}).name).toBe("InitiateCheckout");
    expect(toMeta("purchase", { value: 9900, currency: "ARS" })).toMatchObject({
      name: "Purchase",
      params: { value: 9900, currency: "ARS" },
    });
    expect(toTikTok("purchase", {}).name).toBe("CompletePayment");
    expect(toTikTok("pdf_download", {}).name).toBe("Download");
    expect(toGa4("purchase", {}).name).toBe("purchase");
  });

  it("la primera descarga es Lead en Meta y las siguientes un evento propio", () => {
    expect(toMeta("pdf_download", { first: true }).name).toBe("Lead");
    expect(toMeta("pdf_download", { first: false }).name).toBe("PdfDownload");
  });
});
