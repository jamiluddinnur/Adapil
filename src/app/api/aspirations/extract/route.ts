import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { extractAspirationFromText } from "@/lib/ai";

// Ekstraksi aspirasi dari pesan WhatsApp yang di-forward staf.
// Staf menempel teks pesan → agen mengekstrak (judul, isi, kategori,
// prioritas, wilayah, nama pengirim) → staf memeriksa → simpan.
// Tanpa kunci LLM: aturan kata kunci. Dengan kunci OpenAI/Gemini: LLM
// mengekstrak JSON, lalu hasilnya divalidasi (kategori & wilayah harus
// dari daftar resmi — tidak pernah mengarang).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const text = String(b.text || "").trim();
    if (!text) return NextResponse.json({ error: "Tempel dulu isi pesan WhatsApp-nya." }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: "Pesan terlalu panjang (maks. 5000 karakter)." }, { status: 400 });
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
    const regions = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
    const r = await extractAspirationFromText(text, regions);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
