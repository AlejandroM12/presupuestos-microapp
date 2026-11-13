import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  packPurchasedEmail,
  passwordChangedEmail,
  passwordResetEmail,
  paymentFailedEmail,
  proActivatedEmail,
  proCancelledEmail,
} from "./templates";

const until = new Date("2026-07-10T12:00:00Z");

describe("plantillas de email", () => {
  it("recuperación: incluye el enlace en HTML y texto, y declara vencimiento", () => {
    const url = "https://presupuestos.atajolab.dev/recuperar/abc123";
    const m = passwordResetEmail("ana@example.com", url);
    expect(m.to).toBe("ana@example.com");
    expect(m.html).toContain(`href="${url}"`);
    expect(m.text).toContain(url);
    expect(m.html).toContain("1 hora");
    expect(m.html).toContain('name="viewport"');
  });

  it("escapa el HTML de datos externos (no permite inyección)", () => {
    const m = passwordResetEmail("a@b.co", 'https://x.test/?a="><script>alert(1)</script>');
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("compra del pack y cambio de contraseña tienen asunto y llamada a la acción", () => {
    const pack = packPurchasedEmail("a@b.co");
    expect(pack.subject).toContain("Pack Premium");
    expect(pack.html).toContain("/crear");
    const changed = passwordChangedEmail("a@b.co");
    expect(changed.html).toContain("/recuperar");
  });

  it("Pro: activación, cancelación y cobro fallido informan la fecha de acceso en es-AR", () => {
    const active = proActivatedEmail("a@b.co", "YEARLY", until);
    expect(active.text).toContain("anual");
    expect(active.text).toContain("julio de 2026");
    const cancelled = proCancelledEmail("a@b.co", until);
    expect(cancelled.text).toContain("10 de julio de 2026");
    expect(cancelled.text).toContain("modo lectura");
    expect(paymentFailedEmail("a@b.co", until).text).toContain("10 de julio de 2026");
    expect(paymentFailedEmail("a@b.co", null).text).toContain("no se activará");
  });
});

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

describe("adaptador de Resend (SDK simulado, sin envíos reales)", () => {
  beforeEach(() => {
    send.mockReset();
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("con credenciales envía por Resend con el remitente configurado", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "AtajoLab <no-reply@atajolab.dev>";
    send.mockResolvedValue({ data: { id: "1" }, error: null });
    const { getMailer } = await import("./mailer");
    await getMailer().send({ to: "a@b.co", subject: "Hola", html: "<p>x</p>", text: "x" });
    expect(send).toHaveBeenCalledWith({
      from: "AtajoLab <no-reply@atajolab.dev>",
      to: "a@b.co",
      subject: "Hola",
      html: "<p>x</p>",
      text: "x",
    });
  });

  it("propaga el error del proveedor", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "x@y.z";
    send.mockResolvedValue({ data: null, error: { name: "validation_error" } });
    const { getMailer } = await import("./mailer");
    await expect(
      getMailer().send({ to: "a@b.co", subject: "s", html: "h", text: "t" }),
    ).rejects.toThrow("validation_error");
  });

  it("sin credenciales no envía nada ni falla", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    const { getMailer } = await import("./mailer");
    await expect(
      getMailer().send({ to: "a@b.co", subject: "s", html: "h", text: "t" }),
    ).resolves.toBeUndefined();
    expect(send).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
});
