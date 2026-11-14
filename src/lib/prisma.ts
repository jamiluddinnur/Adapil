import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const PLANS = {
  starter: { name: "Starter", priceMonthly: 1000000, desc: "1 politisi, 1 dapil, inbox aspirasi + peta isu dasar." },
  pro: { name: "Pro", priceMonthly: 1700000, desc: "Starter + Isu & Sentimen, Asisten Legislasi, laporan kinerja otomatis." },
  timses: { name: "Timses / Partai", priceMonthly: 5000000, desc: "Multi-user, multi-dapil, peta kampanye, manajemen relawan." },
  kampanye: { name: "Paket Kampanye", priceMonthly: 0, desc: "Rp15–50 juta per paket 3–6 bulan: setup dapil, monitoring intensif, pendampingan tim." },
} as const;
export type PlanKey = keyof typeof PLANS;
export const PLAN_AMOUNTS: Record<string, number> = { starter: 1000000, pro: 1700000, timses: 5000000, kampanye: 15000000 };
