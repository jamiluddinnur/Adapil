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
    const plan = String(b.plan || "starter");
    const amount = PLAN_AMOUNTS[plan] ?? 1000000;
    const orderId = `ADAPIL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const snap = await createSnapOrder(orderId, amount, user.email, user.name);
    const payment = await prisma.payment.create({
      data: { orderId, userId: user.id, plan, amount, method: String(b.method || "qris"), status: "pending", mode: snap.mode, redirectUrl: snap.redirectUrl },
    });
    return NextResponse.json({ ok: true, payment, mode: snap.mode, redirectUrl: snap.redirectUrl });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
