import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { midtransConfigured, checkMidtransStatus } from "@/lib/midtrans";

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const payment = await prisma.payment.findFirst({ where: { orderId: String(b.orderId || ""), userId: user.id } });
    if (!payment) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (!midtransConfigured()) {
      // SIMULASI: tidak ada tagihan nyata. Tandai lunas untuk demo.
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "paid" } });
      await prisma.subscription.upsert({ where: { userId: user.id }, update: { plan: payment.plan, status: "active" }, create: { userId: user.id, plan: payment.plan, status: "active" } });
      return NextResponse.json({ ok: true, mode: "simulasi", note: "SIMULASI — tidak ada tagihan nyata." });
    }
    const status = await checkMidtransStatus(payment.orderId);
    const tx = String(status?.transaction_status || "");
    if (tx === "settlement" || tx === "capture") {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "paid" } });
      await prisma.subscription.upsert({ where: { userId: user.id }, update: { plan: payment.plan, status: "active" }, create: { userId: user.id, plan: payment.plan, status: "active" } });
      return NextResponse.json({ ok: true, mode: "midtrans", status: "paid" });
    }
    return NextResponse.json({ ok: true, mode: "midtrans", status: tx || "pending" });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
