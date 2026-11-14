import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
export async function POST() {
  const token = cookies().get("adapil_session")?.value;
  if (token) await prisma.session.deleteMany({ where: { token } });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("adapil_session", "", { expires: new Date(0), path: "/" });
  return res;
}
