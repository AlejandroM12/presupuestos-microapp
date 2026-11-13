import { hash, verify } from "@node-rs/argon2";

// Parámetros recomendados por OWASP para argon2id (m=19 MiB, t=2, p=1).
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash ficticio para igualar el tiempo de respuesta cuando el usuario no existe. */
let dummyHash: Promise<string> | null = null;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword("contraseña-ficticia-para-igualar-tiempos");
  await verifyPassword(await dummyHash, password);
}
