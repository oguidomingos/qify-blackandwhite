import { NextRequest, NextResponse } from "next/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_API_TOKEN;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;

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

    if (!EVOLUTION_API_KEY || !EVOLUTION_BASE_URL) {
      throw new Error("Evolution API credentials not configured");
    }

    const account = await fetchQuery(api.wa.getByInstance, { instanceName });

    const logoutResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!logoutResponse.ok) {
      console.warn(`Logout failed: ${logoutResponse.statusText}`);
    }

    // Delete WhatsApp instance
    const deleteResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (!deleteResponse.ok) {
      throw new Error(`Evolution API error: ${deleteResponse.statusText}`);
    }

    if (account) {
      await fetchMutation(api.wa.upsertAccount, {
        orgId: account.orgId,
        instanceId: account.instanceId,
        instanceName: account.instanceName || instanceName,
        phoneNumber: account.phoneNumber,
        status: "disconnected",
        baseUrl: account.baseUrl,
        token: account.token,
        sharedToken: account.sharedToken,
      });
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
