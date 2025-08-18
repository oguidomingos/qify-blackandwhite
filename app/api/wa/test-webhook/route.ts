import { NextRequest, NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { instanceName, action } = body;

    if (!instanceName) {
      return NextResponse.json(
        { error: "instanceName is required" },
        { status: 400 }
      );
    }

    if (action === "start") {
      // Start webhook test - return phone number for user to send message to
      const account = await fetchQuery(api.wa.getByInstance, { instanceName });
      
      if (!account) {
        return NextResponse.json(
          { error: "WhatsApp instance not found" },
          { status: 404 }
        );
      }

      // Update webhook test start time
      await fetchMutation(api.wa.updateWebhookTest, {
        accountId: account._id,
        lastWebhookTestAt: Date.now(),
        webhookVerified: false,
      });

      return NextResponse.json({
        phoneNumber: account.phoneNumber,
        message: `Send a test message to +${account.phoneNumber}`,
        testStarted: true,
        waitTime: 60, // 60 seconds to wait
      });

    } else if (action === "check") {
      // Check if webhook test received a message
      const account = await fetchQuery(api.wa.getByInstance, { instanceName });
      
      if (!account) {
        return NextResponse.json(
          { error: "WhatsApp instance not found" },
          { status: 404 }
        );
      }

      // Check for recent messages (last 2 minutes)
      const recentMessages = await fetchQuery(api.messages.getByInstance, { 
        instanceName,
        limit: 5 
      });

      const testStartTime = account.lastWebhookTestAt || 0;
      const hasRecentInbound = recentMessages.some(msg => 
        msg.direction === "inbound" && 
        msg.createdAt > testStartTime
      );

      if (hasRecentInbound && !account.webhookVerified) {
        // Mark webhook as verified
        await fetchMutation(api.wa.updateWebhookTest, {
          accountId: account._id,
          lastWebhookTestAt: Date.now(),
          webhookVerified: true,
        });

        return NextResponse.json({
          webhookVerified: true,
          message: "Webhook test successful! Message received.",
          canComplete: true,
        });
      }

      return NextResponse.json({
        webhookVerified: account.webhookVerified || false,
        hasRecentMessages: recentMessages.length > 0,
        lastTestAt: account.lastWebhookTestAt,
        canComplete: account.webhookVerified || false,
        recentMessageCount: recentMessages.length,
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'start' or 'check'" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const instanceName = url.searchParams.get("instanceName");

    if (!instanceName) {
      return NextResponse.json(
        { error: "instanceName parameter is required" },
        { status: 400 }
      );
    }

    // Get current webhook test status
    const account = await fetchQuery(api.wa.getByInstance, { instanceName });
    
    if (!account) {
      return NextResponse.json(
        { error: "WhatsApp instance not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      instanceName: account.instanceName,
      phoneNumber: account.phoneNumber,
      status: account.status,
      webhookVerified: account.webhookVerified || false,
      lastWebhookTestAt: account.lastWebhookTestAt,
      qrCode: account.qrCode,
      lastQrAt: account.lastQrAt,
    });

  } catch (error) {
    console.error("Webhook status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}