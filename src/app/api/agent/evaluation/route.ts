import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Evaluasi agen — angka pemakaian 30 hari terakhir, dihitung dari
// AgentToolLog (setiap pemanggilan tool dicatat) + data akun.
// Jujur soal batasnya: ini mengukur PEMAKAIAN, bukan kualitas. Draf yang
// "disetujui" berarti pengguna menekan Setujui; apakah draf itu bagus di
// mata warga, hanya warga yang bisa menilai.
export async function GET() {
  try {
    const user = await requireUser();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [logs, approvedDrafts, docs, corrections] = await Promise.all([
      prisma.agentToolLog.findMany({ where: { userId: user.id, createdAt: { gte: since } } }),
      prisma.aspiration.count({ where: { userId: user.id, draftStatus: "disetujui" } }),
      prisma.legislativeDoc.count({ where: { userId: user.id } }),
      prisma.aiCorrection.count({ where: { userId: user.id } }),
    ]);
    const byTool: Record<string, number> = {};
    let actions = 0;
    let acceptedActions = 0;
    for (const l of logs) {
      byTool[l.tool] = (byTool[l.tool] || 0) + 1;
      if (["buat_draf_balasan", "buat_dokumen", "ubah_status_aspirasi"].includes(l.tool)) {
        actions += 1;
        if (l.accepted) acceptedActions += 1;
      }
    }
    return NextResponse.json({
      ok: true,
      days: 30,
      totalToolCalls: logs.length,
      byTool,
      actions,
      acceptedActions,
      acceptanceRate: actions ? Math.round((acceptedActions / actions) * 100) : null,
      approvedDrafts,
      docsCreated: docs,
      correctionsLearned: corrections,
    });
  } catch {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
}
