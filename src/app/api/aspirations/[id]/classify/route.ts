import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { classifyAspirationRule, draftReplyRule, openaiChat } from "@/lib/ai";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const item = await prisma.aspiration.findFirst({ where: { id: params.id, userId: user.id } });
    if (!item) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    const rule = classifyAspirationRule(item.text || item.title);
    let ai: { category?: string; priority?: string; draft?: string } | null = null;
    const raw = await openaiChat(
      "Kamu asisten legislatif Indonesia. Jawab HANYA JSON: {\"category\": \"...\", \"priority\": \"Mendesak|Tinggi|Sedang|Rendah\", \"draft\": \"...\"}. Kategori harus salah satu: Infrastruktur, Air Bersih, Pendidikan, Kesehatan/BPJS, Bantuan Sosial, Ekonomi, Pertanian, Lingkungan, Lainnya.",
      item.text || item.title,
    );
    if (raw) { try { ai = JSON.parse(raw); } catch { ai = null; } }
    return NextResponse.json({
      ok: true,
      engine: ai ? "openai" : "rule-based (tanpa kunci OpenAI — bekerja manual)",
      category: ai?.category || rule.category,
      priority: ai?.priority || rule.priority,
      title: rule.title,
      draftReply: ai?.draft || draftReplyRule(rule.category, item.region),
    });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
