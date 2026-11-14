import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMidtransSignature } from "@/lib/midtrans";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const orderId = String(b.order_id || "");
  const statusCode = String(b.status_code || "");
  const grossAmount = String(b.gross_amount || "");
  const signature = String(b.signature_key || "");
  const verify = verifyMidtransSignature(orderId, statusCode, grossAmount);
  if (!orderId || !verify(signature)) return NextResponse.json({ error: "Signature tidak valid." }, { status: 403 });
  const tx = String(b.transaction_status || "");
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return NextResponse.json({ ok: true });
  if (tx === "settlement" || tx === "capture") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "paid" } });
    await prisma.subscription.upsert({ where: { userId: payment.userId }, update: { plan: payment.plan, status: "active" }, create: { userId: payment.userId, plan: payment.plan, status: "active" } });
  } else if (tx === "deny" || tx === "cancel" || tx === "expire") {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "failed" } });
  }
  return NextResponse.json({ ok: true });
}
