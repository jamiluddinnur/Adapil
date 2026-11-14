// Katalog dapil resmi NTB — Pemilu 2024, PKPU Nomor 6 Tahun 2023.
// Sumber: KPU Provinsi NTB & lampiran PKPU 6/2023 (tabel dapil kabupaten/kota).
// DPR RI: 2 dapil, 11 kursi. DPRD Provinsi: 8 dapil, 65 kursi.
// DPRD Kabupaten/Kota: 10 kabupaten/kota, 50 dapil, 385 kursi.

export interface Dapil {
  id: string;
  level: "DPR RI" | "DPRD Provinsi" | "DPRD Kabupaten-Kota";
  name: string;
  seats: number;
  /** Wilayah dapil: kabupaten/kota (DPR RI) atau kecamatan (DPRD). */
  regions: string[];
  /** Kabupaten/kota induk, untuk DPRD Kabupaten-Kota. */
  regency?: string;
}

const d = (
  id: string,
  level: Dapil["level"],
  name: string,
  seats: number,
  regions: string[],
  regency?: string,
): Dapil => ({ id, level, name, seats, regions, regency });

export const DAPIL_NTB: Dapil[] = [
  // ---------- DPR RI (11 kursi) ----------
  d("dpr-ntb-1", "DPR RI", "NTB I — Pulau Sumbawa", 3,
    ["Sumbawa Barat", "Sumbawa", "Dompu", "Bima", "Kota Bima"]),
  d("dpr-ntb-2", "DPR RI", "NTB II — Pulau Lombok", 8,
    ["Lombok Barat", "Lombok Utara", "Lombok Timur", "Lombok Tengah", "Kota Mataram"]),

  // ---------- DPRD Provinsi NTB (65 kursi) ----------
  d("prov-ntb-1", "DPRD Provinsi", "NTB 1 — Kota Mataram", 5,
    ["Ampenan", "Cakranegara", "Mataram", "Sekarbela", "Selaprang", "Sandubaya"]),
  d("prov-ntb-2", "DPRD Provinsi", "NTB 2 — Lombok Barat & Lombok Utara", 12,
    ["Gerung", "Kuripan", "Sekotong", "Lembar", "Kediri", "Labuapi", "Gunungsari", "Batu Layar", "Narmada", "Lingsar", "Tanjung", "Gangga", "Kayangan", "Bayan", "Pemenang"]),
  d("prov-ntb-3", "DPRD Provinsi", "NTB 3 — Lombok Timur A", 9,
    ["Masbagik", "Sukamulia", "Selong", "Pringgabaya", "Aikmel", "Sambelia", "Pringgasela", "Suralaga", "Wanasaba", "Sembalun", "Suwela", "Labuhan Haji", "Lenek"]),
  d("prov-ntb-4", "DPRD Provinsi", "NTB 4 — Lombok Timur B", 6,
    ["Keruak", "Sakra", "Terara", "Sikur", "Montong Gading", "Sakra Timur", "Sakra Barat", "Jerowaru"]),
  d("prov-ntb-5", "DPRD Provinsi", "NTB 5 — Sumbawa Barat & Sumbawa", 8,
    ["Taliwang", "Seteluk", "Brang Rea", "Poto Tano", "Brang Ene", "Jereweh", "Sekongkang", "Maluk", "Sumbawa", "Moyo Hilir", "Moyo Utara", "Lunyuk", "Moyo Hulu", "Ropang", "Lape", "Lopok", "Lenangguar", "Orong Telu", "Lantung", "Plampang", "Empang", "Labangka", "Maronge", "Tarano", "Batu Lanteh", "Labuhan Badas", "Unter Iwes", "Alas", "Utan", "Alas Barat", "Buer", "Rhee"]),
  d("prov-ntb-6", "DPRD Provinsi", "NTB 6 — Dompu, Bima & Kota Bima", 11,
    ["Dompu", "Hu'u", "Pajo", "Woja", "Kilo", "Manggalewa", "Kempo", "Pekat", "Monta", "Woha", "Parado", "Bolo", "Madapangga", "Donggo", "Sanggar", "Tambora", "Soromandi", "Wera", "Ambalawi", "Sape", "Lambu", "Belo", "Wawo", "Langgudu", "Lambitu", "Palibelo", "Mpunda", "Rasanae Barat", "Asakota", "Rasanae Timur", "Raba"]),
  d("prov-ntb-7", "DPRD Provinsi", "NTB 7 — Lombok Tengah A", 7,
    ["Praya", "Praya Tengah", "Janapria", "Kopang", "Batukliang", "Batukliang Utara"]),
  d("prov-ntb-8", "DPRD Provinsi", "NTB 8 — Lombok Tengah B", 7,
    ["Jonggat", "Pujut", "Praya Barat", "Praya Timur", "Pringgarata", "Praya Barat Daya"]),

  // ---------- DPRD Kabupaten Bima (45 kursi, 6 dapil) ----------
  d("kab-bima-1", "DPRD Kabupaten-Kota", "Bima 1", 9, ["Monta", "Woha", "Parado"], "Kabupaten Bima"),
  d("kab-bima-2", "DPRD Kabupaten-Kota", "Bima 2", 7, ["Bolo", "Madapangga"], "Kabupaten Bima"),
  d("kab-bima-3", "DPRD Kabupaten-Kota", "Bima 3", 5, ["Donggo", "Sanggar", "Tambora", "Soromandi"], "Kabupaten Bima"),
  d("kab-bima-4", "DPRD Kabupaten-Kota", "Bima 4", 5, ["Wera", "Ambalawi"], "Kabupaten Bima"),
  d("kab-bima-5", "DPRD Kabupaten-Kota", "Bima 5", 9, ["Sape", "Lambu"], "Kabupaten Bima"),
  d("kab-bima-6", "DPRD Kabupaten-Kota", "Bima 6", 10, ["Belo", "Wawo", "Langgudu", "Lambitu", "Palibelo"], "Kabupaten Bima"),

  // ---------- DPRD Kabupaten Dompu (30 kursi, 5 dapil) ----------
  d("kab-dompu-1", "DPRD Kabupaten-Kota", "Dompu 1", 7, ["Dompu"], "Kabupaten Dompu"),
  d("kab-dompu-2", "DPRD Kabupaten-Kota", "Dompu 2", 4, ["Hu'u", "Pajo"], "Kabupaten Dompu"),
  d("kab-dompu-3", "DPRD Kabupaten-Kota", "Dompu 3", 7, ["Woja"], "Kabupaten Dompu"),
  d("kab-dompu-4", "DPRD Kabupaten-Kota", "Dompu 4", 6, ["Kilo", "Manggalewa"], "Kabupaten Dompu"),
  d("kab-dompu-5", "DPRD Kabupaten-Kota", "Dompu 5", 6, ["Kempo", "Pekat"], "Kabupaten Dompu"),

  // ---------- DPRD Kabupaten Lombok Barat (45 kursi, 5 dapil) ----------
  d("kab-lobar-1", "DPRD Kabupaten-Kota", "Lombok Barat 1", 8, ["Gerung", "Kuripan"], "Kabupaten Lombok Barat"),
  d("kab-lobar-2", "DPRD Kabupaten-Kota", "Lombok Barat 2", 8, ["Sekotong", "Lembar"], "Kabupaten Lombok Barat"),
  d("kab-lobar-3", "DPRD Kabupaten-Kota", "Lombok Barat 3", 9, ["Kediri", "Labuapi"], "Kabupaten Lombok Barat"),
  d("kab-lobar-4", "DPRD Kabupaten-Kota", "Lombok Barat 4", 9, ["Gunungsari", "Batu Layar"], "Kabupaten Lombok Barat"),
  d("kab-lobar-5", "DPRD Kabupaten-Kota", "Lombok Barat 5", 11, ["Narmada", "Lingsar"], "Kabupaten Lombok Barat"),

  // ---------- DPRD Kabupaten Lombok Tengah (50 kursi, 6 dapil) ----------
  d("kab-loteng-1", "DPRD Kabupaten-Kota", "Lombok Tengah 1", 9, ["Praya", "Praya Tengah"], "Kabupaten Lombok Tengah"),
  d("kab-loteng-2", "DPRD Kabupaten-Kota", "Lombok Tengah 2", 9, ["Janapria", "Kopang"], "Kabupaten Lombok Tengah"),
  d("kab-loteng-3", "DPRD Kabupaten-Kota", "Lombok Tengah 3", 9, ["Pujut", "Praya Timur"], "Kabupaten Lombok Tengah"),
  d("kab-loteng-4", "DPRD Kabupaten-Kota", "Lombok Tengah 4", 7, ["Praya Barat", "Praya Barat Daya"], "Kabupaten Lombok Tengah"),
  d("kab-loteng-5", "DPRD Kabupaten-Kota", "Lombok Tengah 5", 9, ["Jonggat", "Pringgarata"], "Kabupaten Lombok Tengah"),
  d("kab-loteng-6", "DPRD Kabupaten-Kota", "Lombok Tengah 6", 7, ["Batukliang", "Batukliang Utara"], "Kabupaten Lombok Tengah"),

  // ---------- DPRD Kabupaten Lombok Timur (50 kursi, 5 dapil) ----------
  d("kab-lotim-1", "DPRD Kabupaten-Kota", "Lombok Timur 1", 9, ["Sukamulia", "Selong", "Suralaga", "Labuhan Haji"], "Kabupaten Lombok Timur"),
  d("kab-lotim-2", "DPRD Kabupaten-Kota", "Lombok Timur 2", 11, ["Keruak", "Sakra", "Sakra Timur", "Sakra Barat", "Jerowaru"], "Kabupaten Lombok Timur"),
  d("kab-lotim-3", "DPRD Kabupaten-Kota", "Lombok Timur 3", 8, ["Terara", "Sikur", "Montong Gading"], "Kabupaten Lombok Timur"),
  d("kab-lotim-4", "DPRD Kabupaten-Kota", "Lombok Timur 4", 11, ["Masbagik", "Aikmel", "Pringgasela", "Lenek"], "Kabupaten Lombok Timur"),
  d("kab-lotim-5", "DPRD Kabupaten-Kota", "Lombok Timur 5", 11, ["Pringgabaya", "Sambelia", "Wanasaba", "Sembalun", "Suwela"], "Kabupaten Lombok Timur"),

  // ---------- DPRD Kabupaten Lombok Utara (30 kursi, 5 dapil) ----------
  d("kab-lotara-1", "DPRD Kabupaten-Kota", "Lombok Utara 1", 7, ["Tanjung"], "Kabupaten Lombok Utara"),
  d("kab-lotara-2", "DPRD Kabupaten-Kota", "Lombok Utara 2", 6, ["Gangga"], "Kabupaten Lombok Utara"),
  d("kab-lotara-3", "DPRD Kabupaten-Kota", "Lombok Utara 3", 6, ["Kayangan"], "Kabupaten Lombok Utara"),
  d("kab-lotara-4", "DPRD Kabupaten-Kota", "Lombok Utara 4", 6, ["Bayan"], "Kabupaten Lombok Utara"),
  d("kab-lotara-5", "DPRD Kabupaten-Kota", "Lombok Utara 5", 5, ["Pemenang"], "Kabupaten Lombok Utara"),

  // ---------- DPRD Kabupaten Sumbawa (45 kursi, 5 dapil) ----------
  d("kab-sumbawa-1", "DPRD Kabupaten-Kota", "Sumbawa 1", 9, ["Sumbawa", "Moyo Hilir", "Moyo Utara"], "Kabupaten Sumbawa"),
  d("kab-sumbawa-2", "DPRD Kabupaten-Kota", "Sumbawa 2", 10, ["Lunyuk", "Moyo Hulu", "Ropang", "Lape", "Lopok", "Lenangguar", "Orong Telu", "Lantung"], "Kabupaten Sumbawa"),
  d("kab-sumbawa-3", "DPRD Kabupaten-Kota", "Sumbawa 3", 9, ["Plampang", "Empang", "Labangka", "Maronge", "Tarano"], "Kabupaten Sumbawa"),
  d("kab-sumbawa-4", "DPRD Kabupaten-Kota", "Sumbawa 4", 6, ["Batu Lanteh", "Labuhan Badas", "Unter Iwes"], "Kabupaten Sumbawa"),
  d("kab-sumbawa-5", "DPRD Kabupaten-Kota", "Sumbawa 5", 11, ["Alas", "Utan", "Alas Barat", "Buer", "Rhee"], "Kabupaten Sumbawa"),

  // ---------- DPRD Kabupaten Sumbawa Barat (25 kursi, 3 dapil) ----------
  d("kab-ksb-1", "DPRD Kabupaten-Kota", "Sumbawa Barat 1", 10, ["Taliwang"], "Kabupaten Sumbawa Barat"),
  d("kab-ksb-2", "DPRD Kabupaten-Kota", "Sumbawa Barat 2", 9, ["Seteluk", "Brang Rea", "Poto Tano", "Brang Ene"], "Kabupaten Sumbawa Barat"),
  d("kab-ksb-3", "DPRD Kabupaten-Kota", "Sumbawa Barat 3", 6, ["Jereweh", "Sekongkang", "Maluk"], "Kabupaten Sumbawa Barat"),

  // ---------- DPRD Kota Bima (25 kursi, 4 dapil) ----------
  d("kota-bima-1", "DPRD Kabupaten-Kota", "Kota Bima 1", 5, ["Mpunda"], "Kota Bima"),
  d("kota-bima-2", "DPRD Kabupaten-Kota", "Kota Bima 2", 5, ["Rasanae Barat"], "Kota Bima"),
  d("kota-bima-3", "DPRD Kabupaten-Kota", "Kota Bima 3", 6, ["Asakota"], "Kota Bima"),
  d("kota-bima-4", "DPRD Kabupaten-Kota", "Kota Bima 4", 9, ["Rasanae Timur", "Raba"], "Kota Bima"),

  // ---------- DPRD Kota Mataram (40 kursi, 6 dapil) ----------
  d("kota-mataram-1", "DPRD Kabupaten-Kota", "Kota Mataram 1", 7, ["Mataram"], "Kota Mataram"),
  d("kota-mataram-2", "DPRD Kabupaten-Kota", "Kota Mataram 2", 5, ["Sekarbela"], "Kota Mataram"),
  d("kota-mataram-3", "DPRD Kabupaten-Kota", "Kota Mataram 3", 8, ["Ampenan"], "Kota Mataram"),
  d("kota-mataram-4", "DPRD Kabupaten-Kota", "Kota Mataram 4", 7, ["Selaprang"], "Kota Mataram"),
  d("kota-mataram-5", "DPRD Kabupaten-Kota", "Kota Mataram 5", 7, ["Cakranegara"], "Kota Mataram"),
  d("kota-mataram-6", "DPRD Kabupaten-Kota", "Kota Mataram 6", 6, ["Sandubaya"], "Kota Mataram"),
];

export const DAPIL_TOTALS = {
  dpr: { dapil: 2, seats: 11 },
  provinsi: { dapil: 8, seats: 65 },
  kabkota: { dapil: 50, seats: 385 },
};

export const CATEGORIES = [
  "Infrastruktur", "Air Bersih", "Pendidikan", "Kesehatan/BPJS",
  "Bantuan Sosial", "Ekonomi", "Pertanian", "Lingkungan", "Lainnya",
] as const;

export const PLATFORMS = ["TikTok", "Instagram", "X", "Facebook", "YouTube", "WhatsApp", "Media Online"] as const;
export const SOURCES = ["WhatsApp", "Reses", "DM", "Telepon", "Surat", "Tatap muka"] as const;

export function findDapil(id: string): Dapil | undefined {
  return DAPIL_NTB.find((x) => x.id === id);
}
