import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { findDapil } from "../src/lib/dapil";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@adapil.ai" },
    update: {},
    create: { name: "Demo Adapil", email: "demo@adapil.ai", passwordHash: hashPassword("demo1234") },
  });
  await prisma.subscription.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, plan: "starter" } });

  const dapil = findDapil("prov-ntb-2")!;
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id, name: "H. Demo Adapil", role: "Anggota DPRD Provinsi",
      party: "Partai Demo", level: "DPRD Provinsi", dapilId: dapil.id,
      dapilName: `${dapil.name} — DPRD Provinsi (${dapil.seats} kursi)`,
      regions: dapil.regions.join(", "),
    },
  });

  // Data contoh — jelas ditandai sebagai contoh di UI (akun demo).
  const aspirations = [
    { title: "Jalan rusak di Gerung", text: "Jalan utama di Gerung rusak parah, berlubang besar, warga kesulitan melintas saat hujan.", source: "WhatsApp", category: "Infrastruktur", region: "Gerung", status: "Diproses", priority: "Tinggi", followUp: "Sudah disampaikan ke Dinas PUPR, menunggu jadwal perbaikan.", draftReply: "Terima kasih atas laporannya. Jalan di Gerung sudah kami sampaikan ke Dinas PUPR dan sedang dijadwalkan perbaikannya." },
    { title: "Air bersih di Sekotong", text: "Warga Sekotong kesulitan air bersih, PDAM sering mati saat musim kemarau.", source: "Reses", category: "Air Bersih", region: "Sekotong", status: "Baru", priority: "Mendesak", followUp: "", draftReply: "" },
    { title: "Beasiswa siswa di Tanjung", text: "Orang tua siswa di Tanjung meminta informasi beasiswa untuk anak yang berprestasi tapi kurang mampu.", source: "DM", category: "Pendidikan", region: "Tanjung", status: "Baru", priority: "Sedang", followUp: "", draftReply: "" },
    { title: "Harga gabah turun di Lembar", text: "Petani di Lembar mengeluh harga gabah turun saat panen, mohon dibantu pemasaran.", source: "WhatsApp", category: "Pertanian", region: "Lembar", status: "Selesai", priority: "Tinggi", followUp: "Difasilitasi pertemuan dengan Bulog, harga disepakati.", draftReply: "Terima kasih, aspirasi harga gabah sudah kami fasilitasi ke Bulog." },
    { title: "Sampah menumpuk di Batu Layar", text: "Sampah menumpuk di pinggir jalan Batu Layar, bau dan mengganggu wisatawan.", source: "WhatsApp", category: "Lingkungan", region: "Batu Layar", status: "Baru", priority: "Sedang", followUp: "", draftReply: "" },
  ];
  for (const a of aspirations) await prisma.aspiration.create({ data: { ...a, userId: user.id } });

  await prisma.issue.create({
    data: {
      userId: user.id, title: "Keluhan jalan rusak Gerung viral di TikTok", platform: "TikTok",
      mentions: 320, trend: "naik", posPct: 10, neuPct: 25, negPct: 65, severity: "tinggi",
      themes: "Infrastruktur", status: "Dipantau",
      samplePosts: "Jalan Gerung rusak parah, sudah setahun tidak diperbaiki.\nPemerintah ke mana saja? Jalan ini jalur utama warga.\nSemoga cepat diperbaiki, kasian anak sekolah lewat sini.",
      recommendation: "EMPATI — \"Kami mendengar keluhan warga soal jalan rusak di Gerung dan memahami keresahannya.\"\n\nFAKTA / KLARIFIKASI — \"Terkait jalan Gerung, perbaikan sudah kami sampaikan ke Dinas PUPR dan masuk jadwal. Berikut buktinya: [isi fakta terverifikasi].\"\n\nAKSI — \"Kami akan mengawal perbaikan jalan Gerung dan melaporkan perkembangannya setiap minggu.\"",
      analysisNote: "Estimasi dari 3 contoh unggahan/komentar yang ditempel tim — BUKAN data live platform media sosial.",
    },
  });
  await prisma.issue.create({
    data: {
      userId: user.id, title: "Hoaks bantuan sosial di Lombok Barat", platform: "Facebook",
      mentions: 85, trend: "stabil", posPct: 5, neuPct: 30, negPct: 65, severity: "sedang",
      themes: "Bantuan Sosial", status: "Dipantau", isHoax: true,
      samplePosts: "Katanya ada bansos baru, daftar lewat link ini.\nHati-hati, link itu mencurigakan, jangan klik.\nSudah banyak yang tertipu katanya.",
      recommendation: "EMPATI — \"Kami memahami warga yang berharap mendapat bantuan.\"\n\nFAKTA / KLARIFIKASI — \"Tidak ada pendaftaran bansos melalui link tersebut. Pendaftaran resmi hanya melalui kanal pemerintah.\"\n\nAKSI — \"Kami akan melaporkan link penipuan ini dan menyebarkan informasi resmi.\"",
      clarification: "KLARIFIKASI — Terkait kabar pendaftaran bansos melalui sebuah link yang beredar, kami tegaskan itu TIDAK BENAR. Pendaftaran bansos resmi hanya melalui kanal pemerintah. Jangan klik link mencurigakan dan jangan berikan data pribadi.",
      analysisNote: "Estimasi dari 3 contoh unggahan/komentar yang ditempel tim — BUKAN data live platform media sosial.",
    },
  });

  console.log("Seed selesai. Login demo: demo@adapil.ai / demo1234");
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
