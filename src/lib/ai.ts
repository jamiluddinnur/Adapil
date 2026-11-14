// AI Adapil.ai — rule-based by default (no LLM key required).
// If OPENAI_API_KEY is set, classification / sentiment / drafting use the
// OpenAI chat API; otherwise the keyword engine below runs offline.
// The engine NEVER invents numbers: sentiment percentages come only from
// the sample posts the team pasted, and legislative numbers come only from
// server-computed dapil evidence passed in by the caller.

const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  ["Infrastruktur", ["jalan", "jembatan", "rusak", "berlubang", "aspal", "drainase", "got", "saluran", "lampu jalan", "trotoar", "irigasi", "bendungan"]],
  ["Air Bersih", ["air", "pdam", "sumur", "kering", "kekeringan", "mata air", "pipanisasi"]],
  ["Pendidikan", ["sekolah", "guru", "siswa", "beasiswa", "buku", "ruang kelas", "pendidikan", "madrasah"]],
  ["Kesehatan/BPJS", ["bpjs", "puskesmas", "rumah sakit", "obat", "kesehatan", "dokter", "bidan", "posyandu", "stunting"]],
  ["Bantuan Sosial", ["bansos", "bantuan", "pkh", "blt", "sembako", "rastra", "penerima"]],
  ["Ekonomi", ["harga", "pasar", "umkm", "modal", "dagang", "pengangguran", "kerja", "upah"]],
  ["Pertanian", ["gabah", "padi", "pupuk", "petani", "panen", "sawah", "ternak", "nelayan", "ikan"]],
  ["Lingkungan", ["sampah", "banjir", "longsor", "pohon", "limbah", "lingkungan", "kebakaran"]],
];

const NEG_WORDS = ["rusak", "buruk", "kecewa", "marah", "parah", "jelek", "gagal", "bohong", "hoaks", "tipu", "lambat", "tidak", "belum", "macet", "kotor", "bau", "bermasalah", "menolak", "protes", "demo", "korban", "sulit", "susah", "mahal", "naik", "ancam", "bahaya"];
const POS_WORDS = ["terima kasih", "bagus", "baik", "mantap", "senang", "puas", "membantu", "berhasil", "lancar", "cepat", "apresiasi", "dukung", "hebat", "keren", "terbantu", "selesai"];

export function classifyAspirationRule(text: string): { category: string; priority: string; title: string } {
  const t = text.toLowerCase();
  let best = "Lainnya";
  let bestScore = 0;
  for (const [cat, kws] of CATEGORY_KEYWORDS) {
    const score = kws.filter((k) => t.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  const urgent = /mendesak|darurat|segera|kritis|banjir|longsor|tidak ada air|putus|ambruk/.test(t);
  const priority = urgent ? "Mendesak" : NEG_WORDS.some((w) => t.includes(w)) ? "Tinggi" : "Sedang";
  const title = text.replace(/\s+/g, " ").trim().slice(0, 80) || "Aspirasi warga";
  return { category: best, priority, title };
}

export function draftReplyRule(category: string, region: string): string {
  return `Terima kasih atas aspirasi Bapak/Ibu terkait ${category.toLowerCase()} di ${region || "dapil kami"}. Aspirasi ini sudah kami catat dan akan kami tindak lanjuti — kami akan sampaikan perkembangannya di sini. Mohon kesabarannya, dan silakan sampaikan detail tambahan bila ada.`;
}

export interface SentimentResult {
  pos: number; neu: number; neg: number;
  trend: "naik" | "stabil" | "meredup";
  severity: "rendah" | "sedang" | "tinggi";
  themes: string[];
  note: string;
}

export function analyzeSentimentRule(samplePosts: string, mentions: number): SentimentResult {
  const lines = samplePosts.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const total = Math.max(lines.length, 1);
  let pos = 0, neg = 0;
  for (const line of lines) {
    const l = line.toLowerCase();
    const p = POS_WORDS.filter((w) => l.includes(w)).length;
    const n = NEG_WORDS.filter((w) => l.includes(w)).length;
    if (n > p) neg++;
    else if (p > n) pos++;
  }
  const negPct = Math.round((neg / total) * 100);
  const posPct = Math.round((pos / total) * 100);
  const neuPct = Math.max(0, 100 - negPct - posPct);
  const themes: string[] = [];
  for (const [cat, kws] of CATEGORY_KEYWORDS) {
    if (kws.some((k) => samplePosts.toLowerCase().includes(k))) themes.push(cat);
  }
  const severity = negPct >= 60 || mentions >= 1000 ? "tinggi" : negPct >= 35 || mentions >= 200 ? "sedang" : "rendah";
  const trend = mentions >= 500 ? "naik" : "stabil";
  return {
    pos: posPct, neu: neuPct, neg: negPct, trend, severity,
    themes: themes.slice(0, 4),
    note: `Estimasi dari ${lines.length} contoh unggahan/komentar yang ditempel tim — BUKAN data live platform media sosial. Sentimen dihitung dari kata-kata dalam contoh tersebut, jadi bisa bias bila contohnya tidak mewakili seluruh percakapan.`,
  };
}

export function recommendMessagesRule(title: string, negPct: number, themes: string[]): string {
  const topic = themes[0] || "isu ini";
  return [
    `EMPATI — "Kami mendengar keluhan warga soal ${title.toLowerCase()}. Kami memahami keresahan ini, terutama terkait ${topic.toLowerCase()}, dan kami sedang menindaklanjutinya."`,
    `FAKTA / KLARIFIKASI — "Terkait ${title.toLowerCase()}, berikut fakta yang sudah kami verifikasi: [isi fakta terverifikasi di sini — jangan sebarkan sebelum dicek]. Kami akan sampaikan perkembangan resminya."`,
    `AKSI — "Sebagai tindak lanjut ${title.toLowerCase()}, kami akan [langkah konkret + tenggat]. Kami akan laporkan hasilnya ke warga. Silakan sampaikan informasi tambahan melalui kanal resmi kami."`,
  ].join("\n\n");
}

export function clarificationDraftRule(title: string): string {
  return `KLARIFIKASI — Terkait kabar yang beredar soal ${title.toLowerCase()}, kami mohon warga tidak langsung menyebarkan sebelum dicek. Fakta yang sudah kami verifikasi: [tulis fakta dari sumber resmi di sini]. Bila ada informasi resmi terbaru, kami akan sampaikan melalui kanal ini. Terima kasih.`;
}

export interface ConsultantEvidence {
  profileName: string;
  dapilName: string;
  total: number;
  resolved: number;
  unresolved: number;
  coveragePct: number;
  regionsTotal: number;
  regionsCovered: number;
  blindSpots: string[];
  topCategories: Array<{ category: string; total: number; unresolved: number }>;
  urgent: Array<{ title: string; category: string; region: string; status: string }>;
  risingIssues: Array<{ title: string; platform: string; negPct: number; trend: string; severity: string }>;
  hoaxIssues: Array<{ title: string; platform: string }>;
  docsCount: number;
}

/** Konsultan AI — jawaban berbasis bukti dapil saja, tidak pernah mengarang angka. */
export function answerConsultantRule(q: string, ev: ConsultantEvidence): string {
  const t = q.toLowerCase();
  const thin = ev.total === 0
    ? "Catatan jujur dulu: belum ada satu pun aspirasi tercatat, jadi jawaban di bawah ini belum punya bukti dapil. Isi inbox aspirasi dulu (minimal 10 aspirasi) agar konsultan ini bisa memberi saran yang bisa dipertanggungjawabkan."
    : ev.total < 10
    ? `Catatan jujur: bukti masih tipis — baru ${ev.total} aspirasi tercatat. Saran di bawah ini menggambarkan data yang ada, bukan seluruh dapil.`
    : "";
  const summary = `Data dapil ${ev.dapilName || "belum diatur"}: ${ev.total} aspirasi tercatat (${ev.resolved} selesai, ${ev.unresolved} belum selesai), cakupan wilayah ${ev.coveragePct}% (${ev.regionsCovered} dari ${ev.regionsTotal} wilayah).${ev.topCategories.length ? ` Tekanan tertinggi: ${ev.topCategories.map((c) => `${c.category} (${c.total} aspirasi, ${c.unresolved} belum selesai)`).join("; ")}.` : ""}`;
  const blind = ev.blindSpots.length
    ? `\n\nTitik buta data: ${ev.blindSpots.slice(0, 6).join(", ")}${ev.blindSpots.length > 6 ? ` (+${ev.blindSpots.length - 6} wilayah lagi)` : ""} — wilayah tanpa aspirasi tercatat. Datangi saat reses berikutnya sebelum menyimpulkan.`
    : "";
  const urgentList = ev.urgent.length
    ? `\n\nYang mendesak / belum selesai:\n${ev.urgent.slice(0, 5).map((a) => `• ${a.title} — ${a.category}, ${a.region || "wilayah belum dicatat"}, status ${a.status}`).join("\n")}`
    : "";
  const issuesList = ev.risingIssues.length
    ? `\n\nIsu yang sedang naik:\n${ev.risingIssues.slice(0, 4).map((i) => `• ${i.title} (${i.platform}, sentimen negatif ${i.negPct}%, tren ${i.trend}, tingkat ${i.severity})`).join("\n")}`
    : "";

  if (/halo|hai|selamat|pagi|siang|sore|malam/.test(t) && t.length < 30) {
    return `Halo, ${ev.profileName || "Bapak/Ibu"}! Saya Konsultan AI Adapil — saya menjawab berdasarkan data dapil yang Anda catat sendiri, bukan dari media sosial live.\n\n${summary}${blind}\n\nCoba tanyakan, misalnya: "Apa yang paling mendesak minggu ini?", "Isu apa yang sedang naik?", atau "Apa yang harus saya siapkan untuk reses?"${thin ? `\n\n${thin}` : ""}`;
  }
  if (/mendesak|prioritas|paling penting|apa dulu|harus dilakukan|langkah|tindak lanjut/.test(t)) {
    if (ev.total === 0) {
      return `${summary}\n\n${thin}\n\nLangkah pertama: catat aspirasi warga di tab Aspirasi (WhatsApp, reses, DM) — minimal 10 aspirasi — lalu tanyakan lagi ke saya. Tanpa data itu, saran prioritas apa pun hanya tebakan.`;
    }
    return `${summary}${urgentList || "\n\nTidak ada aspirasi berstatus Mendesak yang tercatat."}\n\nSaran langkah minggu ini:\n1. Selesaikan dulu ${ev.topCategories[0] ? `kategori ${ev.topCategories[0].category} — tekanannya tertinggi (${ev.topCategories[0].total} aspirasi)` : "aspirasi yang belum selesai"}: hubungi dinas terkait dan minta tenggat tertulis.\n2. Perbarui status aspirasi yang sudah ditindaklanjuti di tab Aspirasi, supaya laporan mingguan Anda akurat.\n3. ${ev.risingIssues[0] ? `Respons isu "${ev.risingIssues[0].title}" — lihat 3 rekomendasi pesan di tab Isu & Sentimen sebelum memposting apa pun.` : "Pantau tab Isu & Sentimen — belum ada isu yang trennya naik."}${blind}${thin ? `\n\n${thin}` : ""}`;
  }
  if (/isu|sentimen|viral|hoaks|hoax|media sosial|netizen|ramai/.test(t)) {
    if (!ev.risingIssues.length && !ev.hoaxIssues.length) return `${summary}\n\nBelum ada isu media sosial yang tercatat naik atau berlabel hoaks. Catat isu di tab Isu & Sentimen (tempel contoh unggahan warga) agar saya bisa menganalisis sentimennya.${thin ? `\n\n${thin}` : ""}`;
    return `${summary}${issuesList}${ev.hoaxIssues.length ? `\n\nHoaks / perlu klarifikasi:\n${ev.hoaxIssues.slice(0, 3).map((i) => `• ${i.title} (${i.platform})`).join("\n")}\nJangan sebarkan klarifikasi sebelum faktanya dicek ke sumber resmi — draf klarifikasi ada di tab Isu & Sentimen.` : ""}\n\nSaran: respons isu dengan tren naik dulu, dengan urutan empati → fakta terverifikasi → aksi konkret. Jangan membalas dengan emosi, dan jangan auto-posting tanpa persetujuan Anda.${thin ? `\n\n${thin}` : ""}`;
  }
  if (/reses|pokir|rapat|legislasi|anggaran|pengawasan|raperda|dokumen|briefing|naskah|pendapat/.test(t)) {
    return `${summary}${blind}\n\nUntuk kerja legislasi, gunakan tab Legislasi — di sana ada Matriks Prioritas dan generator 6 dokumen (Briefing Rapat Kerja, Pokir, Bahan Reses, Naskah Pendapat, Usulan Raperda, Bahan Pengawasan) yang disusun dari angka dapil di atas.\n\nSaran saya:\n1. ${ev.topCategories[0] ? `Jadikan ${ev.topCategories[0].category} bahan Pokir / rapat kerja berikutnya — itu kategori dengan tekanan tertinggi.` : "Isi inbox aspirasi dulu agar dokumen punya bukti."}\n2. Untuk rapat anggaran, tanyakan ke dinas: berapa anggaran kategori tertinggi yang sudah terealisasi, dan apa kendalanya.\n3. Untuk reses, kunjungi dulu wilayah titik buta agar datanya tidak kosong sebelah.${thin ? `\n\n${thin}` : ""}`;
  }
  if (/wilayah|titik buta|cakupan|daerah|kecamatan|desa|dapil/.test(t)) {
    return `${summary}${blind || "\n\nSemua wilayah di profil Anda sudah punya aspirasi tercatat — cakupan 100% dari data yang ada."}\n\nSaran: jangan menyimpulkan wilayah titik buta itu "tidak ada masalah" — bisa jadi datanya yang belum masuk. Prioritaskan wilayah itu di reses berikutnya.${thin ? `\n\n${thin}` : ""}`;
  }
  if (/ringkas|briefing|laporan|minggu ini|gambaran|kesimpulan/.test(t)) {
    return `${summary}${urgentList}${issuesList}${blind}\n\nDokumen kerja yang sudah tersimpan: ${ev.docsCount} dokumen legislasi. Laporan mingguan lengkap ada di tab Laporan.${thin ? `\n\n${thin}` : ""}`;
  }
  return `${summary}${urgentList}${issuesList}${blind}\n\nYang bisa saya bantu berdasarkan data dapil Anda:\n• "Apa yang paling mendesak minggu ini?" — prioritas tindak lanjut.\n• "Isu apa yang sedang naik?" — sentimen & rekomendasi respons.\n• "Apa yang harus saya siapkan untuk reses / rapat kerja?" — bahan legislasi dari bukti dapil.\n• "Wilayah mana yang belum terdata?" — titik buta dapil.\n\nSaya tidak bisa menjawab soal yang tidak ada datanya di aplikasi (misalnya sentimen live media sosial atau isi APBD) — untuk itu saya akan bilang datanya belum ada, bukan mengarang.${thin ? `\n\n${thin}` : ""}`;
}

/** Optional OpenAI call. Returns null when no key is set, so callers fall back to rules. */
export async function openaiChat(system: string, userText: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: userText }],
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
