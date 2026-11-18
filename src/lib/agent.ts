// Agen Konsultan Adapil — inilah yang membuat Adapil layak disebut AI agent,
// bukan sekadar chatbot template.
//
// Tiga hal yang membedakannya dari Konsultan AI lama:
//  1. TOOL USE — agen memanggil tool sungguhan (baca database akun ini,
//     membuat draf, membuat dokumen, mengubah status). Setiap pemanggilan
//     dicatat dan ditampilkan ke pengguna sebagai jejak ("Alat yang dipakai").
//  2. PERENCANAAN — sebelum menjawab, agen menyusun rencana tool apa yang
//     perlu dipakai berdasarkan pertanyaan. Dengan kunci OpenAI, rencana itu
//     dibuat model lewat function calling; tanpa kunci, perencana rule-based
//     yang deterministik yang memutuskan.
//  3. TINDAKAN — tool `buat_draf_balasan`, `buat_dokumen`, dan
//     `ubah_status_aspirasi` benar-benar mengubah data (draf tersimpan,
//     dokumen tersimpan, status berubah). Tindakan yang mengubah data HANYA
//     jalan kalau pengguna yang memintanya secara eksplisit di pertanyaan,
//     atau menekan tombol "Lakukan" pada rencana Agen Pagi.

import { prisma } from "./prisma";
import { answerConsultantRule, draftReplyRule, type ConsultantEvidence } from "./ai";
import { llmChatWithTools } from "./llm";
import { generateLegislativeDoc } from "./legislative";

export type ToolCall = { name: string; args: Record<string, unknown>; result: string };
export type AgentToolResult = { summary: string; data?: unknown };

const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- bukti dapil
export async function collectEvidence(userId: string): Promise<ConsultantEvidence & { correctionsCount: number; raw: { aspirations: any[]; issues: any[] } }> {
  const [aspirations, profile, issues, docs, corrections] = await Promise.all([
    prisma.aspiration.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.profile.findUnique({ where: { userId } }),
    prisma.issue.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.legislativeDoc.findMany({ where: { userId } }),
    prisma.aiCorrection.findMany({ where: { userId } }),
  ]);
  const regions = (profile?.regions || "").split(",").map((s) => s.trim()).filter(Boolean);
  const covered = new Set(aspirations.map((a) => a.region).filter(Boolean));
  const blindSpots = regions.filter((r) => !covered.has(r));
  const byCategory: Record<string, { total: number; unresolved: number }> = {};
  for (const a of aspirations) {
    byCategory[a.category] = byCategory[a.category] || { total: 0, unresolved: 0 };
    byCategory[a.category].total += 1;
    if (a.status !== "Selesai") byCategory[a.category].unresolved += 1;
  }
  const topCategories = Object.entries(byCategory)
    .map(([category, v]) => ({ category, total: v.total, unresolved: v.unresolved }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
  return {
    profileName: profile?.name || "",
    dapilName: profile?.dapilName || "",
    total: aspirations.length,
    resolved: aspirations.filter((a) => a.status === "Selesai").length,
    unresolved: aspirations.filter((a) => a.status !== "Selesai").length,
    coveragePct: regions.length ? Math.round((covered.size / regions.length) * 100) : 0,
    regionsTotal: regions.length,
    regionsCovered: covered.size,
    blindSpots,
    topCategories,
    urgent: aspirations
      .filter((a) => a.priority === "Mendesak" || a.status !== "Selesai")
      .slice(0, 5)
      .map((a) => ({ title: a.title, category: a.category, region: a.region, status: a.status })),
    risingIssues: issues
      .filter((i) => i.trend === "naik")
      .slice(0, 4)
      .map((i) => ({ title: i.title, platform: i.platform, negPct: i.negPct, trend: i.trend, severity: i.severity })),
    hoaxIssues: issues.filter((i) => i.isHoax).map((i) => ({ title: i.title, platform: i.platform })),
    docsCount: docs.length,
    correctionsCount: corrections.length,
    raw: { aspirations, issues },
  };
}

export function evidenceText(ev: ConsultantEvidence & { correctionsCount: number }): string {
  return [
    `Dapil: ${ev.dapilName || "belum diatur"}. Politisi: ${ev.profileName || "-"}.`,
    `Total aspirasi: ${ev.total} (selesai ${ev.resolved}, belum selesai ${ev.unresolved}).`,
    `Cakupan wilayah: ${ev.regionsCovered} dari ${ev.regionsTotal} wilayah (${ev.coveragePct}%). Titik buta: ${ev.blindSpots.join(", ") || "tidak ada"}.`,
    `Kategori teratas: ${ev.topCategories.map((c) => `${c.category} ${c.total} aspirasi, ${c.unresolved} belum selesai`).join("; ") || "belum ada"}.`,
    `Isu naik: ${ev.risingIssues.map((i) => `${i.title} (${i.platform}, negatif ${i.negPct}%)`).join("; ") || "tidak ada"}.`,
    `Dokumen legislasi tersimpan: ${ev.docsCount}.`,
    ev.correctionsCount > 0 ? `Agen sudah belajar dari ${ev.correctionsCount} koreksi pengguna sebelumnya.` : "",
  ].filter(Boolean).join(" ");
}

// -------------------------------------------------------------------- tools
export const AGENT_TOOL_DEFS = [
  { name: "ringkas_dapil", description: "Ringkasan bukti dapil: total aspirasi, selesai/belum, cakupan wilayah, kategori teratas, titik buta.", parameters: { type: "object", properties: {} } },
  { name: "cari_aspirasi", description: "Cari aspirasi berdasarkan kata kunci, kategori, wilayah, status, atau prioritas.", parameters: { type: "object", properties: { kata_kunci: { type: "string" }, kategori: { type: "string" }, wilayah: { type: "string" }, status: { type: "string" }, prioritas: { type: "string" } } } },
  { name: "aspirasi_mendesak", description: "Aspirasi belum selesai yang paling mendesak, diurutkan yang paling lama menunggu.", parameters: { type: "object", properties: {} } },
  { name: "isu_naik", description: "Isu media sosial yang trennya naik dan isu berlabel hoaks.", parameters: { type: "object", properties: {} } },
  { name: "titik_buta", description: "Wilayah dapil yang belum punya satu pun aspirasi tercatat.", parameters: { type: "object", properties: {} } },
  { name: "buat_draf_balasan", description: "Buat dan SIMPAN draf balasan WhatsApp untuk satu aspirasi. Draf tetap harus diperiksa manusia sebelum dikirim.", parameters: { type: "object", properties: { aspirationId: { type: "string" } }, required: ["aspirationId"] } },
  { name: "buat_dokumen", description: "Buat dan SIMPAN dokumen legislasi (briefing, pokir, reses, pendapat, raperda, pengawasan) dari bukti dapil.", parameters: { type: "object", properties: { type: { type: "string", enum: ["briefing", "pokir", "reses", "pendapat", "raperda", "pengawasan"] } }, required: ["type"] } },
  { name: "ubah_status_aspirasi", description: "Ubah status satu aspirasi (Baru/Diproses/Selesai). Hanya dipakai bila pengguna memintanya secara eksplisit.", parameters: { type: "object", properties: { aspirationId: { type: "string" }, status: { type: "string", enum: ["Baru", "Diproses", "Selesai"] } }, required: ["aspirationId", "status"] } },
];

const pickAsp = (a: any) => ({ id: a.id, judul: a.title, kategori: a.category, wilayah: a.region, status: a.status, prioritas: a.priority, sumber: a.source, dibuat: a.createdAt });

export async function runAgentTool(userId: string, name: string, args: Record<string, any>): Promise<AgentToolResult> {
  switch (name) {
    case "ringkas_dapil": {
      const ev = await collectEvidence(userId);
      return { summary: evidenceText(ev), data: ev };
    }
    case "cari_aspirasi": {
      const all = await prisma.aspiration.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
      const kw = String(args.kata_kunci || "").toLowerCase();
      const found = all.filter((a) => {
        if (args.kategori && a.category !== args.kategori) return false;
        if (args.wilayah && a.region !== args.wilayah) return false;
        if (args.status && a.status !== args.status) return false;
        if (args.prioritas && a.priority !== args.prioritas) return false;
        if (kw && !(a.title + " " + a.text).toLowerCase().includes(kw)) return false;
        return true;
      }).slice(0, 5);
      return {
        summary: found.length
          ? `Ditemukan ${found.length} aspirasi: ${found.map((a) => `"${a.title}" (${a.category}, ${a.region || "wilayah belum dicatat"}, ${a.status}, prioritas ${a.priority})`).join("; ")}.`
          : "Tidak ditemukan aspirasi yang cocok dengan pencarian itu.",
        data: found.map(pickAsp),
      };
    }
    case "aspirasi_mendesak": {
      const all = await prisma.aspiration.findMany({ where: { userId, status: { not: "Selesai" } }, orderBy: { createdAt: "asc" }, take: 20 });
      const rank: Record<string, number> = { Mendesak: 0, Tinggi: 1, Sedang: 2, Rendah: 3 };
      const sorted = [...all].sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2));
      const top = sorted.slice(0, 5);
      return {
        summary: top.length
          ? `Paling mendesak: ${top.map((a) => `"${a.title}" (${a.category}, ${a.region || "wilayah belum dicatat"}, prioritas ${a.priority}, sudah ${Math.max(0, Math.floor((Date.now() - new Date(a.createdAt).getTime()) / DAY))} hari)`).join("; ")}.`
          : "Tidak ada aspirasi mendesak yang belum selesai.",
        data: top.map(pickAsp),
      };
    }
    case "isu_naik": {
      const issues = await prisma.issue.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
      const rising = issues.filter((i) => i.trend === "naik");
      const hoax = issues.filter((i) => i.isHoax);
      return {
        summary: [
          rising.length ? `Isu naik: ${rising.map((i) => `"${i.title}" (${i.platform}, negatif ${i.negPct}%)`).join("; ")}.` : "Tidak ada isu yang trennya naik.",
          hoax.length ? `Hoaks/perlu klarifikasi: ${hoax.map((i) => `"${i.title}" (${i.platform})`).join("; ")}.` : "",
        ].filter(Boolean).join(" "),
        data: { rising: rising.map((i) => ({ id: i.id, judul: i.title, platform: i.platform, negPct: i.negPct })), hoax: hoax.map((i) => ({ id: i.id, judul: i.title, platform: i.platform })) },
      };
    }
    case "titik_buta": {
      const ev = await collectEvidence(userId);
      return {
        summary: ev.blindSpots.length
          ? `Titik buta data (${ev.blindSpots.length} wilayah tanpa aspirasi tercatat): ${ev.blindSpots.join(", ")}. Cakupan dapil ${ev.coveragePct}% (${ev.regionsCovered} dari ${ev.regionsTotal} wilayah).`
          : "Tidak ada titik buta — semua wilayah sudah punya aspirasi tercatat.",
        data: ev.blindSpots,
      };
    }
    case "buat_draf_balasan": {
      const item = await prisma.aspiration.findFirst({ where: { id: String(args.aspirationId || ""), userId } });
      if (!item) return { summary: "Draf gagal dibuat: aspirasi yang dimaksud tidak ditemukan." };
      const draft = draftReplyRule(item.category, item.region, item.title);
      await prisma.aspiration.update({ where: { id: item.id }, data: { draftReply: draft } });
      return { summary: `Draf balasan untuk "${item.title}" sudah dibuat dan tersimpan di aspirasi itu. Periksa dulu sebelum dikirim ke WhatsApp.`, data: { aspirationId: item.id, draft } };
    }
    case "buat_dokumen": {
      const type = String(args.type || "briefing");
      const { doc, engine } = await generateLegislativeDoc(userId, type);
      const saved = await prisma.legislativeDoc.create({ data: { userId, type, title: doc.title, summary: doc.summary, findings: doc.findings, talkingPoints: doc.talkingPoints, questions: doc.questions, actions: doc.actions, content: doc.content, dataGaps: doc.dataGaps } });
      return { summary: `Dokumen "${doc.title}" sudah dibuat (${engine}) dan tersimpan di tab Legislasi.`, data: { docId: saved.id, title: doc.title } };
    }
    case "ubah_status_aspirasi": {
      const status = String(args.status || "");
      if (!["Baru", "Diproses", "Selesai"].includes(status)) return { summary: "Status tidak valid — harus Baru, Diproses, atau Selesai." };
      const item = await prisma.aspiration.findFirst({ where: { id: String(args.aspirationId || ""), userId } });
      if (!item) return { summary: "Status gagal diubah: aspirasi yang dimaksud tidak ditemukan." };
      await prisma.aspiration.update({ where: { id: item.id }, data: { status } });
      return { summary: `Status "${item.title}" diubah menjadi ${status}.`, data: { aspirationId: item.id, status } };
    }
    default:
      return { summary: `Tool "${name}" tidak dikenal.` };
  }
}

// ------------------------------------------------------- perencana rule-based
export function planToolsRuleBased(question: string): Array<{ name: string; args: Record<string, any> }> {
  const t = question.toLowerCase();
  const steps: Array<{ name: string; args: Record<string, any> }> = [];
  const wantsDoc = /buat|buatkan|susun|siapkan/.test(t) && /dokumen|briefing|pokir|reses|raperda|naskah|pendapat|pengawasan|rapat/.test(t);
  const wantsDraft = /draf|balas|jawab|balasan/.test(t);
  const wantsStatusChange = /tandai|ubah status|jadikan|tutup|selesai/.test(t) && /selesai|diproses|baru/.test(t);
  const docType =
    /pokir|pokok pikiran/.test(t) ? "pokir"
    : /reses/.test(t) ? "reses"
    : /raperda/.test(t) ? "raperda"
    : /pendapat|naskah/.test(t) ? "pendapat"
    : /pengawasan/.test(t) ? "pengawasan"
    : "briefing";

  // 1. Selalu mulai dari ringkasan bukti — agen tidak menjawab dari ingatan.
  steps.push({ name: "ringkas_dapil", args: {} });

  if (wantsStatusChange) {
    const status = /selesai/.test(t) ? "Selesai" : /diproses/.test(t) ? "Diproses" : "Baru";
    steps.push({ name: "cari_aspirasi", args: { kata_kunci: extractKeyword(t) } });
    steps.push({ name: "ubah_status_aspirasi", args: { __from_search: true, status } });
    return steps;
  }
  if (wantsDraft) {
    steps.push({ name: "cari_aspirasi", args: { kata_kunci: extractKeyword(t) } });
    steps.push({ name: "buat_draf_balasan", args: { __from_search: true } });
    return steps;
  }
  if (wantsDoc) {
    steps.push({ name: "buat_dokumen", args: { type: docType } });
    return steps;
  }
  if (/mendesak|prioritas|paling penting|apa dulu|harus dilakukan|langkah/.test(t)) {
    steps.push({ name: "aspirasi_mendesak", args: {} });
  }
  if (/\bisu\b|sentimen|viral|hoaks|hoax|media sosial|netizen|ramai/.test(t)) {
    steps.push({ name: "isu_naik", args: {} });
  }
  if (/reses|pokir|rapat|legislasi|anggaran|pengawasan|raperda|dokumen|briefing/.test(t)) {
    steps.push({ name: "titik_buta", args: {} });
  }
  // \b penting: "desa" adalah substring dari "mendesak" — tanpa batas kata,
  // pertanyaan soal yang mendesak akan salah dikira pertanyaan soal desa.
  if (/\bwilayah\b|titik buta|cakupan|\bdaerah\b|\bkecamatan\b|\bdesa\b|\bdapil\b/.test(t)) {
    steps.push({ name: "titik_buta", args: {} });
  }
  if (/ringkas|briefing|laporan|minggu ini|gambaran|kesimpulan/.test(t)) {
    steps.push({ name: "aspirasi_mendesak", args: {} });
    steps.push({ name: "isu_naik", args: {} });
  }
  // Buang tool yang sama bila terpilih dua kali dari cabang berbeda.
  const seen = new Set<string>();
  return steps.filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)));
}

// Kata kunci pencarian: kata-kata bermakna dari pertanyaan (tanpa kata perintah).
function extractKeyword(t: string): string {
  const stop = new Set("apa yang dan di ke dari untuk dengan tolong buatkan buat ubah tandai jadikan tutup draf balas jawab balasan status selesai diproses baru aspirasi isu dokumen saya aku tolongnya mohon yang ini itu ada tidak".split(" "));
  return t
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stop.has(w))
    .slice(0, 3)
    .join(" ");
}

// ------------------------------------------------------------- orkestrasi agen
// Setiap pemanggilan tool DICATAT ke AgentToolLog — inilah yang membuat agen
// bisa dievaluasi (bukan cuma diklaim): tool apa yang dipakai, seberapa
// sering, dan berapa yang disetujui pengguna.
export async function logToolCall(
  userId: string,
  tool: string,
  args: Record<string, unknown>,
  result: string,
  source: string,
  accepted = false,
) {
  try {
    await prisma.agentToolLog.create({
      data: { userId, tool, args: JSON.stringify(args).slice(0, 1000), result: result.slice(0, 1000), source, accepted },
    });
  } catch { /* pencatatan gagal — agen tetap jalan */ }
}

export async function runAgent(userId: string, question: string, source = "konsultan"): Promise<{ answer: string; engine: string; tools: ToolCall[] }> {
  const ev = await collectEvidence(userId);
  const calls: ToolCall[] = [];
  const actionNotes: string[] = [];
  let lastSearch: any[] = [];

  const exec = async (name: string, rawArgs: Record<string, any>) => {
    const args = { ...rawArgs };
    if (args.__from_search) {
      delete args.__from_search;
      if (!args.aspirationId) {
        if (!lastSearch.length) {
          calls.push({ name, args, result: "Dilewati: tidak ditemukan aspirasi yang dimaksud." });
          return { summary: "Dilewati: tidak ditemukan aspirasi yang dimaksud." };
        }
        args.aspirationId = lastSearch[0].id;
      }
    }
    // Model LLM kadang memanggil tool aksi tanpa aspirationId — pakai hasil
    // pencarian terakhir sebagai targetnya (bila ada).
    if (["buat_draf_balasan", "ubah_status_aspirasi"].includes(name) && !args.aspirationId && lastSearch.length) {
      args.aspirationId = lastSearch[0].id;
    }
    const r = await runAgentTool(userId, name, args);
    calls.push({ name, args, result: r.summary });
    void logToolCall(userId, name, args, r.summary, source);
    if (name === "cari_aspirasi" && Array.isArray(r.data)) lastSearch = r.data;
    if (["buat_draf_balasan", "buat_dokumen", "ubah_status_aspirasi"].includes(name)) actionNotes.push(r.summary);
    return r;
  };

  // Jalur 1 — LLM function calling (OpenAI atau Gemini), bila kunci tersedia.
  const system = `Kamu Agen Konsultan Adapil untuk anggota dewan di Indonesia. Kamu MENJAWAB HANYA dari tool yang kamu panggil — jangan mengarang angka, nama wilayah, atau fakta. Panggil tool yang relevan dulu (ringkas_dapil untuk gambaran umum), baru jawab dalam Bahasa Indonesia yang ringkas dengan saran langkah konkret. Bila bukti tipis, katakan di awal.\n\nATURAN KEAMANAN (wajib): jangan pernah menyebut nama orang sebagai pelaku kejahatan atau penyebar hoaks tanpa bukti dari data; bila data tidak ada, katakan tidak ada. Draf klarifikasi hoaks harus mengutip sumber resmi bila ada, dan selalu ingatkan bahwa draf harus disetujui manusia sebelum diterbitkan. Jangan menjanjikan kemenangan pemilu, APBD cair, atau proyek turun.\n\nBUKTI DAPIL: ${evidenceText(ev)}`;
  const llm = await llmChatWithTools(system, question, AGENT_TOOL_DEFS, exec);
  if (llm && llm.finalText && llm.calls.length > 0) {
    return { answer: appendActionNotes(llm.finalText, actionNotes, ev), engine: `agen (${llm.provider} + tool)`, tools: calls };
  }
  // Model tidak memanggil tool apa pun (atau tidak ada kunci) — jatuh ke
  // jalur rule-based di bawah.

  // Jalur 2 — perencana rule-based (jalan tanpa kunci LLM).
  const plan = planToolsRuleBased(question);
  for (const step of plan) await exec(step.name, step.args);
  let answer = answerConsultantRule(question, ev);
  if (ev.correctionsCount > 0) {
    answer += `\n\nCatatan: aku sudah belajar dari ${ev.correctionsCount} koreksimu sebelumnya, jadi klasifikasi kali ini memakai pelajaran itu.`;
  }
  return { answer: appendActionNotes(answer, actionNotes, ev), engine: "agen (rule-based + tool)", tools: calls };
}

function appendActionNotes(answer: string, notes: string[], ev: ConsultantEvidence & { correctionsCount: number }): string {
  if (!notes.length) return answer;
  return `${answer}\n\nYang sudah kulakukan:\n${notes.map((n) => `• ${n}`).join("\n")}`;
}

/** Pemeriksaan harian sekali sehari — dipakai Beranda dan cron. */
export async function ensureDailyBriefing(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const existing = await prisma.agentRun.findFirst({
    where: { userId, createdAt: { gte: start } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return { run: existing, isNew: false };
  const { summary, actions } = await runMorningBriefing(userId);
  const run = await prisma.agentRun.create({ data: { userId, summary, actions: JSON.stringify(actions) } });
  return { run, isNew: true };
}

// ---------------------------------------------------------- Agen Pagi (loop)
// Pemeriksaan otomatis: apa yang berubah / tertunda / naik sejak kemarin,
// lalu rencana tindakan hari ini. Dipanggil sekali sehari (rute menyimpan
// hasilnya sebagai AgentRun supaya tidak dihitung ulang tiap buka Beranda).
export type BriefingAction = { id: string; kind: "buat_draf" | "buat_dokumen" | "buka_aspirasi"; title: string; detail: string; aspirationId?: string; docType?: string };

export async function runMorningBriefing(userId: string): Promise<{ summary: string; actions: BriefingAction[] }> {
  const ev = await collectEvidence(userId);
  const since = new Date(Date.now() - DAY);
  const baru = ev.raw.aspirations.filter((a: any) => new Date(a.createdAt) >= since);
  const rank: Record<string, number> = { Mendesak: 0, Tinggi: 1, Sedang: 2, Rendah: 3 };
  const overdue = ev.raw.aspirations
    .filter((a: any) => a.status !== "Selesai" && Date.now() - new Date(a.createdAt).getTime() >= 7 * DAY)
    .sort((a: any, b: any) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const urgent = ev.raw.aspirations
    .filter((a: any) => a.status !== "Selesai" && a.priority === "Mendesak")
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const rising = ev.raw.issues.filter((i: any) => i.trend === "naik");

  const summary = [
    `Pemeriksaan agen ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.`,
    `${baru.length} aspirasi baru dalam 24 jam terakhir.`,
    `${ev.unresolved} aspirasi belum selesai (${urgent.length} mendesak, ${overdue.length} sudah tertunda ≥7 hari).`,
    rising.length ? `${rising.length} isu sedang naik: ${rising.map((i: any) => i.title).join("; ")}.` : "Tidak ada isu yang trennya naik.",
    ev.blindSpots.length ? `${ev.blindSpots.length} wilayah masih tanpa aspirasi tercatat.` : "Semua wilayah sudah terdata.",
  ].join(" ");

  const actions: BriefingAction[] = [];
  for (const a of [...urgent, ...overdue.filter((o: any) => !urgent.some((u: any) => u.id === o.id))].slice(0, 3)) {
    actions.push({
      id: `draf-${a.id}`,
      kind: "buat_draf",
      title: `Buat draf balasan: ${a.title}`,
      detail: `${a.category} · ${a.region || "wilayah belum dicatat"} · prioritas ${a.priority}`,
      aspirationId: a.id,
    });
  }
  if (ev.total >= 5 && ev.topCategories.length) {
    actions.push({
      id: "dok-pokir",
      kind: "buat_dokumen",
      title: `Buat Pokir dari kategori ${ev.topCategories[0].category}`,
      detail: `${ev.topCategories[0].total} aspirasi, ${ev.topCategories[0].unresolved} belum selesai — tekanan tertinggi saat ini.`,
      docType: "pokir",
    });
  }
  if (overdue.length > 0) {
    actions.push({
      id: `buka-${overdue[0].id}`,
      kind: "buka_aspirasi",
      title: `Periksa yang paling lama tertunda: ${overdue[0].title}`,
      detail: `Sudah ${Math.floor((Date.now() - new Date(overdue[0].createdAt).getTime()) / DAY)} hari tanpa penyelesaian.`,
      aspirationId: overdue[0].id,
    });
  }
  return { summary, actions: actions.slice(0, 5) };
}
