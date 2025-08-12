import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    console.error("OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/settings/organization/google?error=${error}`, req.url)
    );
  }

  if (!code || !state) {
    return NextResponse.json({ 
      error: "Missing code or state parameter" 
    }, { status: 400 });
  }

  try {
    const stateData = JSON.parse(
      Buffer.from(state, "base64").toString()
    );
    const { orgId, userId } = stateData;

    if (!orgId || !userId) {
      throw new Error("Invalid state data");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorData}`);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userinfoResponse.ok) {
      throw new Error("Failed to get user info");
    }

    const userinfo = await userinfoResponse.json();

    // TODO: Save credentials to Convex
    // This would require setting up Convex HTTP API
    console.log("Google OAuth success:", {
      orgId,
      userId,
      email: userinfo.email,
    });

    return NextResponse.redirect(
      new URL("/settings/organization/google?connected=1", req.url)
    );

  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings/organization/google?error=callback_failed`, req.url)
    );
  }
}