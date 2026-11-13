import { describe, expect, it } from "vitest";
import { addPeriod, isSubscriptionActive, periodKey } from "./subscription";

const now = new Date("2026-06-15T12:00:00Z");
const future = new Date("2026-07-01T00:00:00Z");
const past = new Date("2026-06-01T00:00:00Z");

describe("isSubscriptionActive", () => {
  it("activa con período vigente", () => {
    expect(isSubscriptionActive({ status: "ACTIVE", currentPeriodEnd: future }, now)).toBe(true);
  });

  it("cancelada conserva el acceso hasta el fin del período pagado", () => {
    expect(isSubscriptionActive({ status: "CANCELLED", currentPeriodEnd: future }, now)).toBe(true);
    expect(isSubscriptionActive({ status: "CANCELLED", currentPeriodEnd: past }, now)).toBe(false);
  });

  it("pago rechazado: acceso solo mientras dure lo ya pagado", () => {
    expect(isSubscriptionActive({ status: "PAST_DUE", currentPeriodEnd: future }, now)).toBe(true);
    expect(isSubscriptionActive({ status: "PAST_DUE", currentPeriodEnd: past }, now)).toBe(false);
  });

  it("pendiente, vencida o sin fin de período no tiene acceso", () => {
    expect(isSubscriptionActive({ status: "PENDING", currentPeriodEnd: future }, now)).toBe(false);
    expect(isSubscriptionActive({ status: "EXPIRED", currentPeriodEnd: future }, now)).toBe(false);
    expect(isSubscriptionActive({ status: "ACTIVE", currentPeriodEnd: null }, now)).toBe(false);
  });

  it("no hay acceso exactamente en el instante de vencimiento", () => {
    expect(isSubscriptionActive({ status: "ACTIVE", currentPeriodEnd: now }, now)).toBe(false);
  });
});

describe("periodKey", () => {
  it("usa el mes calendario en UTC", () => {
    expect(periodKey(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
    expect(periodKey(new Date("2026-02-01T00:00:00Z"))).toBe("2026-02");
  });
});

describe("addPeriod", () => {
  it("suma un mes ajustando fines de mes", () => {
    expect(addPeriod(new Date("2026-01-31T10:00:00Z"), "MONTHLY").toISOString()).toBe(
      "2026-02-28T10:00:00.000Z",
    );
    expect(addPeriod(new Date("2028-01-31T10:00:00Z"), "MONTHLY").toISOString()).toBe(
      "2028-02-29T10:00:00.000Z",
    );
    expect(addPeriod(new Date("2026-12-15T10:00:00Z"), "MONTHLY").toISOString()).toBe(
      "2027-01-15T10:00:00.000Z",
    );
  });

  it("suma un año", () => {
    expect(addPeriod(new Date("2026-03-10T00:00:00Z"), "YEARLY").toISOString()).toBe(
      "2027-03-10T00:00:00.000Z",
    );
    expect(addPeriod(new Date("2028-02-29T00:00:00Z"), "YEARLY").toISOString()).toBe(
      "2029-02-28T00:00:00.000Z",
    );
  });
});
