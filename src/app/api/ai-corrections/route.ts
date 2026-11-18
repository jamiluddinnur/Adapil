import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Pelajaran dari koreksi — inilah memori belajar agen.
// POST: rekam satu koreksi (mis. AI menyarankan kategori Infrastruktur,
// pengguna mengubahnya menjadi Air Bersih). GET: daftar koreksi + jumlahnya.
export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.aiCorrection.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    return NextResponse.json({ items, total: items.length });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const field = String(b.field || "");
    const toValue = String(b.toValue || "");
    if (!["category", "priority"].includes(field) || !toValue) {
      return NextResponse.json({ error: "Koreksi butuh field (category/priority) dan nilai baru." }, { status: 400 });
    }
    const item = await prisma.aiCorrection.create({
      data: {
        userId: user.id,
        kind: "klasifikasi",
        field,
        fromValue: String(b.fromValue || ""),
        toValue,
        context: String(b.context || "").slice(0, 500),
      },
    });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
