import { z } from "zod";
import { issuerSchema } from "@/domain/quote/schema";
import { CURRENCIES } from "@/domain/quote/types";
import { db } from "@/server/db";

export const profileSchema = issuerSchema.extend({
  accentColor: z
    .union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")])
    .default(""),
  defaultCurrency: z.enum(CURRENCIES).default("ARS"),
  defaultValidityDays: z
    .number("Ingresá los días")
    .int()
    .min(1, "Mínimo 1 día")
    .max(365, "Máximo 365 días")
    .default(15),
  defaultPaymentTerms: z.string().trim().max(500, "Máximo 500 caracteres").default(""),
  defaultTerms: z.string().trim().max(3000, "Máximo 3000 caracteres").default(""),
});
export type ProfileInput = z.input<typeof profileSchema>;

export async function getBusinessProfile(userId: string) {
  return db.businessProfile.findUnique({ where: { userId } });
}

export async function saveBusinessProfile(userId: string, input: unknown) {
  const data = profileSchema.parse(input);
  return db.businessProfile.upsert({
    where: { userId },
    create: { ...data, userId },
    update: data,
  });
}
