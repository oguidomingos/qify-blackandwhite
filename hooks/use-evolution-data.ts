"use client";

import { useEffect, useState } from "react";

interface DashboardData {
  todayMessages: number;
  activeContacts: number;
  activeSessions: number;
  responseTime: number;
  spinSessions: Array<{
    id: string;
    contactId: string;
    status: string;
    stage: string;
    spinStage: string;
    score: number;
    qualified: boolean;
    lastActivityAt: number;
    createdAt: number;
    summary?: string;
  }>;
  contacts: Array<{
    _id: string;
    name: string;
    channel: string;
    externalId: string;
    lastMessageAt: number;
    createdAt: number;
  }>;
  recentMessages: Array<{
    _id: string;
    contactId: string;
    direction: "inbound" | "outbound";
    text: string;
    createdAt: number;
  }>;
  isLoading: boolean;
  error: string | null;
}

const EMPTY_STATE: DashboardData = {
  todayMessages: 0,
  activeContacts: 0,
  activeSessions: 0,
  responseTime: 3,
  spinSessions: [],
  contacts: [],
  recentMessages: [],
  isLoading: true,
  error: null,
};

function spinStageFromShort(short: string): string {
  switch (short) {
    case "P": return "problem";
    case "I": return "implication";
    case "N": return "needPayoff";
    case "S":
    default: return "situation";
  }
}

export function useEvolutionData(): DashboardData {
  const [data, setData] = useState<DashboardData>(EMPTY_STATE);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [statsRes, chatsRes, messagesRes, spinRes] = await Promise.all([
          fetch("/api/evolution/instance-stats"),
          fetch("/api/evolution/chats?limit=50"),
          fetch("/api/evolution/messages?period=today&limit=100"),
          fetch("/api/evolution/spin-analysis"),
        ]);

        if (cancelled) return;

        const [stats, chatsData, messagesData, spinData] = await Promise.all([
          statsRes.json(),
          chatsRes.json(),
          messagesRes.json(),
          spinRes.json(),
        ]);

        if (cancelled) return;

        const contacts = (chatsData.chats || []).map((chat: any) => ({
          _id: String(chat._id),
          name: chat.contactName || chat.contactId?.split("@")[0] || "Unknown",
          channel: "whatsapp",
          externalId: chat.contactId,
          lastMessageAt: chat.lastActivityAt || chat.lastMessage?.timestamp || Date.now(),
          createdAt: chat.lastActivityAt || Date.now(),
        }));

        const recentMessages = (messagesData.messages || []).map((message: any) => ({
          _id: String(message._id),
          contactId: String(message.contactId),
          direction: message.direction as "inbound" | "outbound",
          text: message.text,
          createdAt: message.createdAt,
        }));

        const spinSessions = (spinData.sessions || []).map((session: any) => ({
          id: session.contactId,
          contactId: session.contactId,
          status: session.qualified ? "qualified" : "active",
          stage: session.currentStage,
          spinStage: spinStageFromShort(session.currentStage),
          score: session.score,
          qualified: session.qualified,
          lastActivityAt: session.lastActivity || Date.now(),
          createdAt: session.lastActivity || Date.now(),
          summary: session.summary || undefined,
        }));

        setData({
          todayMessages: stats.totalMessages || 0,
          activeContacts: stats.totalContacts || 0,
          activeSessions: stats.totalChats || 0,
          responseTime: 3,
          spinSessions,
          contacts,
          recentMessages,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Failed to load data",
        }));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return data;
}
