import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { openaiChat } from "@/lib/ai";

const TYPE_LABELS: Record<string, string> = {
  briefing: "Briefing Rapat Kerja",
  pokir: "Pokok Pikiran (Pokir)",
  reses: "Bahan Reses",
  pendapat: "Naskah Pendapat",
  raperda: "Usulan Raperda",
  pengawasan: "Bahan Pengawasan",
};

/**
 * Generator dokumen legislasi.
 * SEMUA angka berasal dari bukti server (aspirasi & profil akun ini).
 * AI (bila ada kunci OpenAI) hanya merapikan bahasa — ia tidak boleh
 * menyebut angka di luar bukti, dan celah data diakui secara jujur.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const b = await req.json().catch(() => ({}));
    const type = String(b.type || "briefing");
    const label = TYPE_LABELS[type] || "Briefing Rapat Kerja";
    const [aspirations, profile, issues] = await Promise.all([
      prisma.aspiration.findMany({ where: { userId: user.id } }),
      prisma.profile.findUnique({ where: { userId: user.id } }),
      prisma.issue.findMany({ where: { userId: user.id } }),
    ]);
    const regions = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
    const covered = new Set(aspirations.map((a) => a.region).filter(Boolean));
    const blindSpots = regions.filter((r) => !covered.has(r));
    const byCategory: Record<string, number> = {};
    const unresolved: Record<string, number> = {};
    for (const a of aspirations) {
      byCategory[a.category] = (byCategory[a.category] || 0) + 1;
      if (a.status !== "Selesai") unresolved[a.category] = (unresolved[a.category] || 0) + 1;
    }
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const total = aspirations.length;
    const resolved = aspirations.filter((a) => a.status === "Selesai").length;
    const coveragePct = regions.length ? Math.round((covered.size / regions.length) * 100) : 0;
    const dapil = profile?.dapilName || "dapil belum diatur";
    const gaps: string[] = [];
    if (total === 0) gaps.push("Belum ada satu pun aspirasi tercatat — dokumen ini belum punya bukti dapil.");
    if (total > 0 && total < 10) gaps.push(`Bukti masih tipis: baru ${total} aspirasi tercatat. Angka di bawah ini menggambarkan data yang ada, bukan seluruh dapil.`);
    if (blindSpots.length) gaps.push(`${blindSpots.length} wilayah tanpa aspirasi tercatat (${blindSpots.slice(0, 6).join(", ")}${blindSpots.length > 6 ? ", …" : ""}) — belum diketahui apakah di sana tidak ada masalah atau datanya belum masuk.`);
    if (!profile) gaps.push("Profil politisi/dapil belum diisi.");

    const evidenceText = [
      `Dapil: ${dapil}.`,
      `Total aspirasi tercatat: ${total} (selesai ${resolved}, belum selesai ${total - resolved}).`,
      `Cakupan wilayah: ${covered.size} dari ${regions.length} wilayah (${coveragePct}%).`,
      `Kategori teratas: ${top.length ? top.map(([c, n]) => `${c} ${n} aspirasi`).join("; ") : "belum ada"}.`,
      `Isu media sosial terpantau: ${issues.length} isu.`,
    ].join(" ");

    const summary = `Dokumen ${label} untuk ${profile?.name || "anggota dewan"} (${dapil}). Berdasarkan ${total} aspirasi tercatat, ${resolved} sudah selesai dan ${total - resolved} masih berjalan. Cakupan data dapil ${coveragePct}% (${covered.size} dari ${regions.length} wilayah).${top.length ? ` Tekanan tertinggi ada pada ${top[0][0]} (${top[0][1]} aspirasi).` : ""}`;
    const findings = top.length
      ? top.map(([c, n]) => `• ${c}: ${n} aspirasi tercatat, ${unresolved[c] || 0} di antaranya belum selesai.`).join("\n")
      : "• Belum ada aspirasi tercatat — isi inbox aspirasi dulu agar dokumen ini punya bukti.";
    const talkingPoints = top.length
      ? top.map(([c, n]) => `• Soal ${c.toLowerCase()}: ada ${n} aspirasi warga di dapil ini, dan kami meminta penjelasan serta tindak lanjut konkret dari dinas terkait.`).join("\n")
      : "• Minta data resmi dinas terkait sebelum rapat, karena data dapil kita masih kosong.";
    const questions = [
      "• Berapa anggaran yang sudah dialokasikan untuk kategori dengan tekanan tertinggi, dan berapa yang sudah terealisasi?",
      "• Apa kendala dinas dalam menyelesaikan aspirasi yang masih berstatus Diproses?",
      "• Kapan warga di wilayah yang belum terdata akan didatangi / disurvei?",
    ].join("\n");
    const actions = [
      `• Prioritaskan ${top[0]?.[0] || "kategori dengan tekanan tertinggi"} dalam pembahasan anggaran / pengawasan berikutnya.`,
      `• Tindak lanjuti ${total - resolved} aspirasi yang belum selesai dan perbarui statusnya di Adapil.ai.`,
      `• Isi data wilayah titik buta (${blindSpots.slice(0, 4).join(", ") || "—"}) pada reses berikutnya.`,
    ].join("\n");

    let content = `${label}\n${profile?.name || ""} — ${dapil}\n\nRINGKASAN EKSEKUTIF\n${summary}\n\nTEMUAN BERBASIS BUKTI DAPIL\n${evidenceText}\n${findings}\n\nPOIN BICARA\n${talkingPoints}\n\nPERTANYAAN UNTUK MITRA KERJA\n${questions}\n\nREKOMENDASI TINDAKAN\n${actions}\n\nCELAH DATA (JUJUR)\n${gaps.length ? gaps.map((g) => `• ${g}`).join("\n") : "• Tidak ada celah data yang terdeteksi dari data yang tercatat."}\n\nCatatan: draf ini disusun dari data dapil yang tercatat di Adapil.ai. Periksa kembali sebelum dipakai di rapat — manusia yang menyetujui, bukan AI.`;
    // Optional LLM polish of the prose only — numbers stay exactly as computed above.
    const polished = await openaiChat(
      "Kamu asisten legislatif Indonesia. Rapikan bahasa draf berikut menjadi bahasa resmi yang sopan dan tajam. JANGAN mengubah angka apa pun, JANGAN menambah fakta atau angka baru, JANGAN menghapus bagian CELAH DATA. Kembalikan draf lengkap.",
      content,
    );
    if (polished) content = polished;

    return NextResponse.json({
      ok: true,
      engine: polished ? "openai + bukti server" : "template + bukti server (tanpa kunci OpenAI)",
      doc: {
        type, title: `${label} — ${profile?.dapilName || "Dapil NTB"}`,
        summary, findings, talkingPoints, questions, actions, content,
        dataGaps: gaps.join("\n"),
      },
    });
  } catch { return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }); }
}
