import { issuerSchema } from "@/domain/quote/schema";
import { z } from "zod";
import { db } from "@/server/db";

export const profileSchema = issuerSchema.extend({
  accentColor: z
    .union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido")])
    .default(""),
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
