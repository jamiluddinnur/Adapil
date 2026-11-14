import { NextResponse } from "next/server";
import { DAPIL_NTB, DAPIL_TOTALS } from "@/lib/dapil";

// Katalog dapil publik (data resmi PKPU 6/2023) — tidak butuh login.
export async function GET() {
  return NextResponse.json({ items: DAPIL_NTB, totals: DAPIL_TOTALS });
}
