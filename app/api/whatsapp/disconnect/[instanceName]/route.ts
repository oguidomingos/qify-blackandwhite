import { NextRequest, NextResponse } from "next/server";

// API key protegida
const EVOLUTION_API_KEY = "509dbd54-c20c-4a5b-b889-a0494a861f5a";

export async function POST(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const { instanceName } = params;

    if (!instanceName) {
      return NextResponse.json(
        { error: "Instance name is required" },
        { status: 400 }
      );
    }

    // Logout from WhatsApp instance
    const logoutResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!logoutResponse.ok) {
      console.warn(`Logout failed: ${logoutResponse.statusText}`);
    }

    // Delete WhatsApp instance
    const deleteResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Evolution API error: ${deleteResponse.statusText}`);
    }

    return NextResponse.json({
      success: true,
      message: "Instance disconnected and deleted successfully"
    });

  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    return NextResponse.json(
      { error: "Failed to disconnect WhatsApp instance" },
      { status: 500 }
    );
  }
}