import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "./rate-limit";

describe("RateLimiter", () => {
  it("permite hasta el límite y bloquea el excedente", () => {
    const rl = new RateLimiter(2, 1000, () => 0);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    const blocked = rl.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it("separa las claves y reinicia la ventana", () => {
    let t = 0;
    const rl = new RateLimiter(1, 1000, () => t);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
    t = 1001;
    expect(rl.check("a").allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("toma la primera IP de X-Forwarded-For", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("cae a unknown sin cabeceras", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
