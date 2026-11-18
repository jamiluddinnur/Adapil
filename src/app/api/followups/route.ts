import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Semua tindak lanjut akun ini — dipakai Laporan Bulanan.
export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.followUp.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 200 });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
