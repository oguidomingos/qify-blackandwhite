import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, instanceName } = body;

    if (!orgId || !instanceName) {
      return NextResponse.json(
        { error: "orgId and instanceName are required" },
        { status: 400 }
      );
    }

    // Get WhatsApp account for this instance
    const account = await fetchQuery(api.wa.getByInstance, { instanceName });
    
    if (!account) {
      return NextResponse.json(
        { error: "WhatsApp instance not found" },
        { status: 404 }
      );
    }

    // Call Evolution API to get QR code
    const qrResponse = await fetch(`${account.baseUrl}/instance/connect/${account.instanceId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": account.token,
      },
    });

    if (!qrResponse.ok) {
      const errorText = await qrResponse.text();
      console.error("Evolution API error:", errorText);
      return NextResponse.json(
        { error: "Failed to generate QR code" },
        { status: 500 }
      );
    }

    const qrData = await qrResponse.json();
    
    // Extract QR code from response (Evolution API format)
    const qrCode = qrData.qrcode || qrData.base64 || qrData.qr;
    
    if (!qrCode) {
      return NextResponse.json(
        { error: "No QR code received from Evolution API" },
        { status: 500 }
      );
    }

    // Update WhatsApp account with QR code and timestamp
    await fetchMutation(api.wa.updateQrCode, {
      accountId: account._id,
      qrCode,
      lastQrAt: Date.now(),
      status: "qr_pending"
    });

    // Return QR code for immediate rendering
    return NextResponse.json({
      qrCode,
      instanceName,
      instanceId: account.instanceId,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}