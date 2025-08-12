import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "qify-sdr-agent",
    version: "1.0.0",
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    checks: {
      convex: !!process.env.NEXT_PUBLIC_CONVEX_URL,
      clerk: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      evolution: !!process.env.EVOLUTION_API_KEY,
      gemini: !!process.env.GEMINI_API_KEY,
    }
  };

  // Determine overall health status
  const allChecksPass = Object.values(health.checks).every(check => check === true);
  
  return NextResponse.json(
    {
      ...health,
      status: allChecksPass ? "healthy" : "degraded"
    },
    { 
      status: allChecksPass ? 200 : 503 
    }
  );
}