import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { instanceName } = await request.json();
    if (!instanceName) {
      return NextResponse.json({ error: "instanceName is required" }, { status: 400 });
    }

    const cookieStore = cookies();
    cookieStore.set("wa_instance", instanceName, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    return NextResponse.json({ success: true, instanceName });
  } catch (error) {
    console.error("save-instance error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { orgId, userId } = auth();
    if (!orgId && !userId) {
      return NextResponse.json({ instanceName: null }, { status: 401 });
    }

    const cookieStore = cookies();
    const instanceName = cookieStore.get("wa_instance")?.value || null;
    return NextResponse.json({ instanceName });
  } catch {
    return NextResponse.json({ instanceName: null });
  }
}
