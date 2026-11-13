import { describe, expect, it } from "vitest";
import { mapPaymentStatus } from "./gateway";
import { verifyWebhookSignature } from "./index";
import { signWebhook } from "./test-helpers";

const secret = "secreto-de-prueba";
const now = () => 1_800_000_000_000;
const ts = 1_800_000_000;

describe("verifyWebhookSignature", () => {
  const base = { dataId: "123456", requestId: "req-1" };

  it("acepta una firma válida y reciente", () => {
    const xSignature = signWebhook({ secret, ...base, ts });
    expect(
      verifyWebhookSignature(
        { xSignature, xRequestId: base.requestId, dataId: base.dataId },
        secret,
        now,
      ),
    ).toBe(true);
  });

  it("rechaza una firma hecha con otro secreto", () => {
    const xSignature = signWebhook({ secret: "otro", ...base, ts });
    expect(
      verifyWebhookSignature(
        { xSignature, xRequestId: base.requestId, dataId: base.dataId },
        secret,
        now,
      ),
    ).toBe(false);
  });

  it("rechaza si cambia el identificador del recurso o del request", () => {
    const xSignature = signWebhook({ secret, ...base, ts });
    expect(
      verifyWebhookSignature(
        { xSignature, xRequestId: base.requestId, dataId: "999" },
        secret,
        now,
      ),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ xSignature, xRequestId: "otro", dataId: base.dataId }, secret, now),
    ).toBe(false);
  });

  it("rechaza notificaciones viejas (repetición)", () => {
    const xSignature = signWebhook({ secret, ...base, ts: ts - 3600 });
    expect(
      verifyWebhookSignature(
        { xSignature, xRequestId: base.requestId, dataId: base.dataId },
        secret,
        now,
      ),
    ).toBe(false);
  });

  it("rechaza cabeceras ausentes o mal formadas y secreto no configurado", () => {
    expect(
      verifyWebhookSignature({ xSignature: null, xRequestId: "r", dataId: "1" }, secret, now),
    ).toBe(false);
    expect(
      verifyWebhookSignature({ xSignature: "basura", xRequestId: "r", dataId: "1" }, secret, now),
    ).toBe(false);
    const xSignature = signWebhook({ secret, ...base, ts });
    expect(
      verifyWebhookSignature(
        { xSignature, xRequestId: base.requestId, dataId: base.dataId },
        "",
        now,
      ),
    ).toBe(false);
  });
});

describe("mapPaymentStatus", () => {
  it("traduce los estados del proveedor", () => {
    expect(mapPaymentStatus("approved")).toBe("APPROVED");
    expect(mapPaymentStatus("rejected")).toBe("REJECTED");
    expect(mapPaymentStatus("cancelled")).toBe("CANCELLED");
    expect(mapPaymentStatus("refunded")).toBe("REFUNDED");
    expect(mapPaymentStatus("charged_back")).toBe("REFUNDED");
    for (const s of ["pending", "in_process", "in_mediation", "authorized", "algo_nuevo"]) {
      expect(mapPaymentStatus(s)).toBe("PENDING");
    }
  });
});
