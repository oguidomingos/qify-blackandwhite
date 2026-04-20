import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_BASE_URL = (process.env.EVOLUTION_BASE_URL || "").trim();

export async function GET() {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!EVOLUTION_API_KEY || !EVOLUTION_BASE_URL) {
      return NextResponse.json({ error: "Evolution API not configured" }, { status: 500 });
    }

    const res = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_API_KEY },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Evolution API error: ${res.status} ${text}` }, { status: 502 });
    }

    const raw: any[] = await res.json();

    const instances = raw.map((inst) => ({
      id: inst.id,
      name: inst.name,
      connectionStatus: inst.connectionStatus, // "open" | "connecting" | "close"
      profileName: inst.profileName || null,
      profilePicUrl: inst.profilePicUrl || null,
      phoneNumber: inst.number || inst.ownerJid?.split("@")[0] || null,
      messageCount: inst._count?.Message || 0,
      contactCount: inst._count?.Contact || 0,
    }));

    return NextResponse.json({ instances });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
