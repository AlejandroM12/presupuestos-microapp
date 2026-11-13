export type SubscriptionStatusValue = "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export interface SubscriptionLike {
  status: SubscriptionStatusValue;
  currentPeriodEnd: Date | null;
}

/**
 * El acceso Pro dura hasta el fin del período pagado, incluso si la suscripción se canceló
 * o el siguiente cobro falló. Sin un fin de período confirmado no hay acceso.
 */
export function isSubscriptionActive(sub: SubscriptionLike, now: Date = new Date()): boolean {
  if (sub.status === "PENDING" || sub.status === "EXPIRED") return false;
  return sub.currentPeriodEnd !== null && sub.currentPeriodEnd.getTime() > now.getTime();
}

/** Mes calendario en UTC con formato YYYY-MM (clave del contador de descargas). */
export function periodKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Suma meses o años respetando el último día del mes (31 ene + 1 mes = 28/29 feb). */
export function addPeriod(from: Date, plan: "MONTHLY" | "YEARLY"): Date {
  const months = plan === "YEARLY" ? 12 : 1;
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}
