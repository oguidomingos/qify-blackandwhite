import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { orgId, userId } = auth();
  
  if (!orgId || !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return NextResponse.json({ 
      error: "Google OAuth not configured" 
    }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar",
    state: Buffer.from(JSON.stringify({ orgId, userId })).toString("base64")
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  
  return NextResponse.redirect(authUrl);
}