import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { applyLearnedCorrections, classifyAspirationRule, draftReplyRule } from "@/lib/ai";
import { llmChat } from "@/lib/llm";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const item = await prisma.aspiration.findFirst({ where: { id: params.id, userId: user.id } });
    if (!item) return NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
    const rule = classifyAspirationRule(item.text || item.title);
    // Belajar dari koreksi: bila teks ini mirip dengan aspirasi yang pernah
    // dikoreksi pengguna, hasil koreksi itu menang atas aturan kata kunci.
    const corrections = await prisma.aiCorrection.findMany({ where: { userId: user.id, kind: "klasifikasi" }, orderBy: { createdAt: "desc" }, take: 50 });
    const learned = applyLearnedCorrections(item.text || item.title, corrections);
    let ai: { category?: string; priority?: string; draft?: string } | null = null;
    const raw = await llmChat(
      "Kamu asisten legislatif Indonesia. Jawab HANYA JSON: {\"category\": \"...\", \"priority\": \"Mendesak|Tinggi|Sedang|Rendah\", \"draft\": \"...\"}. Kategori harus salah satu: Infrastruktur, Air Bersih, Pendidikan, Kesehatan/BPJS, Bantuan Sosial, Ekonomi, Pertanian, Lingkungan, Lainnya.",
      item.text || item.title,
    );
    if (raw) { try { ai = JSON.parse(raw.text); } catch { ai = null; } }
    const category = ai?.category || learned.category || rule.category;
    const priority = ai?.priority || learned.priority || rule.priority;
    return NextResponse.json({
      ok: true,
      engine: ai ? raw!.provider : learned.matched.length ? `agen belajar (${learned.matched.join(", ")})` : "rule-based (tanpa kunci LLM — bekerja manual)",
      category,
      priority,
      title: rule.title,
      draftReply: ai?.draft || draftReplyRule(category, item.region, item.title),
    });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
