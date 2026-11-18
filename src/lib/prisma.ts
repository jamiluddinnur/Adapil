import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Langganan berbayar hanya dua: Pro dan Timses / Partai.
// Starter adalah paket awal gratis (bukan langganan yang dibeli) — 1 politisi,
// 1 dapil, inbox aspirasi. Paket Kampanye dihapus dari daftar langganan.
export const PLANS = {
  starter: { name: "Starter", priceMonthly: 0, desc: "Paket awal gratis: 1 politisi, 1 dapil, inbox aspirasi." },
  pro: { name: "Pro", priceMonthly: 499000, desc: "Starter + Isu & Sentimen, Asisten Legislasi, Konsultan AI, laporan kinerja otomatis." },
  timses: { name: "Timses / Partai", priceMonthly: 1000000, desc: "Pro + multi-user, multi-dapil, peta kampanye, manajemen relawan." },
} as const;
export type PlanKey = keyof typeof PLANS;
export const PAID_PLANS = ["pro", "timses"] as const;
export const PLAN_AMOUNTS: Record<string, number> = { starter: 0, pro: 499000, timses: 1000000 };
