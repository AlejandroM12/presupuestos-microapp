import { z } from "zod";
import { customerSchema } from "@/domain/quote/schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { NotFoundError } from "./quotes";

export const customerInputSchema = customerSchema;
export type CustomerInput = z.input<typeof customerSchema>;

export async function createCustomer(userId: string, input: unknown) {
  const data = customerSchema.parse(input);
  return db.customer.create({ data: { ...data, userId } });
}

export async function updateCustomer(userId: string, id: string, input: unknown) {
  const data = customerSchema.parse(input);
  const result = await db.customer.updateMany({ where: { id, userId }, data });
  if (result.count === 0) throw new NotFoundError("Cliente");
}

export async function deleteCustomer(userId: string, id: string) {
  // Los presupuestos conservan su snapshot; el vínculo pasa a nulo (onDelete: SetNull).
  const result = await db.customer.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new NotFoundError("Cliente");
}

export async function getCustomer(userId: string, id: string) {
  const customer = await db.customer.findFirst({ where: { id, userId } });
  if (!customer) throw new NotFoundError("Cliente");
  return customer;
}

export async function listCustomers(userId: string, search?: string) {
  const term = search?.trim();
  const where: Prisma.CustomerWhereInput = {
    userId,
    ...(term
      ? {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { company: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  return db.customer.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    include: { _count: { select: { quotes: true } } },
  });
}
