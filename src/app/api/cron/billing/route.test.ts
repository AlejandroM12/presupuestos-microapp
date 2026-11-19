import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const enabled = !!process.env.TEST_DATABASE_URL;
const call = (secret?: string) =>
  POST(
    new Request("http://localhost/api/cron/billing", {
      method: "POST",
      headers: secret === undefined ? {} : { authorization: `Bearer ${secret}` },
    }),
  );

// Los secretos se generan en cada corrida: ningún valor real vive en el código ni en los logs.
const fresh = () => randomBytes(32).toString("base64url");

describe("autorización del cron de facturación y rotación del secreto", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = fresh();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("rechaza sin encabezado, con un secreto incorrecto y con esquema distinto", async () => {
    expect((await call()).status).toBe(401);
    expect((await call(fresh())).status).toBe(401);
    const wrongScheme = await POST(
      new Request("http://localhost/api/cron/billing", {
        method: "POST",
        headers: { authorization: process.env.CRON_SECRET! },
      }),
    );
    expect(wrongScheme.status).toBe(401);
  });

  it("sin CRON_SECRET configurado el endpoint queda cerrado (nunca abierto)", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("")).status).toBe(401);
    expect((await call("undefined")).status).toBe(401);
  });

  it("no revela el secreto en ninguna respuesta", async () => {
    const secret = process.env.CRON_SECRET!;
    const denied = await call(fresh());
    expect(JSON.stringify(await denied.json())).not.toContain(secret);
  });

  it.skipIf(!enabled)(
    "al rotar el secreto, el anterior deja de funcionar y el nuevo sí",
    async () => {
      const oldSecret = process.env.CRON_SECRET!;
      expect((await call(oldSecret)).status).toBe(200);

      const newSecret = fresh();
      process.env.CRON_SECRET = newSecret;
      expect((await call(oldSecret)).status).toBe(401);
      const ok = await call(newSecret);
      expect(ok.status).toBe(200);
      expect(JSON.stringify(await ok.json())).not.toContain(newSecret);
    },
  );
});
