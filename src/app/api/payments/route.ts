import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { createSnapOrder, midtransMode } from "@/lib/midtrans";
import { PLAN_AMOUNTS } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.payment.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items, mode: midtransMode() });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const plan = String(b.plan || "");
    // Langganan berbayar hanya Pro dan Timses / Partai. Starter gratis (tidak dibeli).
    if (plan !== "pro" && plan !== "timses") return NextResponse.json({ error: "Paket yang bisa dibeli hanya Pro (Rp499.000/bulan) dan Timses / Partai (Rp1.000.000/bulan). Starter gratis." }, { status: 400 });
    const amount = PLAN_AMOUNTS[plan];
    const orderId = `ADAPIL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const snap = await createSnapOrder(orderId, amount, user.email, user.name);
    const payment = await prisma.payment.create({
      data: { orderId, userId: user.id, plan, amount, method: String(b.method || "qris"), status: "pending", mode: snap.mode, redirectUrl: snap.redirectUrl },
    });
    return NextResponse.json({ ok: true, payment, mode: snap.mode, redirectUrl: snap.redirectUrl });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
