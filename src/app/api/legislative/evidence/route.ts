import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Dokumen pendukung legislasi (RUU / Perda / APBD / surat dinas).
// Teks PDF diekstrak di browser pengguna (pdfjs-dist) lalu dikirim sebagai
// teks — tidak ada berkas yang diunggah ke server. Generator dokumen hanya
// menyebut judul + jumlah dokumen ini, tidak mengarang angka dari isinya.
export async function GET() {
  try {
    const user = await requireUser();
    const items = await prisma.docEvidence.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const title = String(b.title || "").trim();
    const text = String(b.text || "").trim();
    if (!title || !text) return NextResponse.json({ error: "Judul dan isi dokumen wajib ada." }, { status: 400 });
    if (text.length > 200000) return NextResponse.json({ error: "Teks dokumen terlalu panjang (maks. 200.000 karakter)." }, { status: 400 });
    const kind = ["RUU", "Perda", "APBD", "Surat Dinas", "Dokumen"].includes(String(b.kind)) ? String(b.kind) : "Dokumen";
    const item = await prisma.docEvidence.create({ data: { userId: user.id, title, kind, text } });
    return NextResponse.json({ ok: true, item });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
