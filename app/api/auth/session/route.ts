import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/session";
export async function GET() { const session = await getAdminSession(); return session ? NextResponse.json({ data: session }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ message: "No active session." }, { status: 401 }); }
