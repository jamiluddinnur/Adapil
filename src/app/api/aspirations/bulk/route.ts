import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Impor massal aspirasi — dipakai halaman Aspirasi (tempel/pilih berkas CSV).
// Body: { rows: [{ title?, text, source?, category?, region?, priority? }] }
// Dibatasi 200 baris per impor supaya satu unggahan tidak membanjiri database.
const ALLOWED_SOURCES = ["WhatsApp", "Reses", "DM", "Telepon", "Surat", "Tatap muka"];
const ALLOWED_PRIORITIES = ["Mendesak", "Tinggi", "Sedang", "Rendah"];

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const rows = Array.isArray(b.rows) ? b.rows : [];
    if (rows.length === 0) return NextResponse.json({ error: "Tidak ada baris aspirasi untuk diimpor." }, { status: 400 });
    if (rows.length > 200) return NextResponse.json({ error: "Maksimal 200 aspirasi per impor." }, { status: 400 });
    const data = rows
      .map((r: any) => {
        const text = String(r.text || r.title || "").trim();
        if (!text) return null;
        return {
          userId: user.id,
          title: String(r.title || text).slice(0, 120),
          text,
          source: ALLOWED_SOURCES.includes(String(r.source)) ? String(r.source) : "WhatsApp",
          category: String(r.category || "Lainnya"),
          region: String(r.region || ""),
          status: "Baru",
          priority: ALLOWED_PRIORITIES.includes(String(r.priority)) ? String(r.priority) : "Sedang",
          followUp: "",
          draftReply: "",
        };
      })
      .filter(Boolean) as any[];
    if (data.length === 0) return NextResponse.json({ error: "Tidak ada baris valid — tiap baris butuh isi aspirasi." }, { status: 400 });
    const created = await prisma.aspiration.createMany({ data });
    return NextResponse.json({ ok: true, created: created.count, skipped: rows.length - data.length });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
