"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";

interface EvolutionStats {
  totalMessages: number;
  totalContacts: number;
  totalChats: number;
  instanceStatus: string;
  instanceName: string;
  phoneNumber: string;
  profileName: string;
  lastUpdate: string;
}

interface DashboardData {
  // Stats for cards
  todayMessages: number;
  activeContacts: number;
  activeSessions: number;
  responseTime: number;
  
  // SPIN methodology data
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
  
  // Contacts list (mock based on Evolution data)
  contacts: Array<{
    _id: string;
    name: string;
    channel: string;
    externalId: string;
    lastMessageAt: number;
    createdAt: number;
  }>;
  
  // Recent messages
  recentMessages: Array<{
    _id: string;
    contactId: string;
    direction: "inbound" | "outbound";
    text: string;
    createdAt: number;
  }>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export function useEvolutionData(): DashboardData {
  const { organization } = useOrganization();
  const { user } = useUser();
  
  // Early return with error if no user is logged in
  if (!user?.id) {
    return {
      todayMessages: 0,
      activeContacts: 0,
      activeSessions: 0,
      responseTime: 3,
      spinSessions: [],
      contacts: [],
      recentMessages: [],
      isLoading: false,
      error: "Faça login para ver os dados"
    };
  }

  // Temporary: return mock data to test auth issues
  return {
    todayMessages: 15,
    activeContacts: 8,
    activeSessions: 3,
    responseTime: 2.5,
    spinSessions: [
      {
        id: "test-1",
        contactId: "contact-1", 
        status: "active",
        stage: "P",
        spinStage: "Problem",
        score: 75,
        qualified: true,
        lastActivityAt: Date.now() - 3600000,
        createdAt: Date.now() - 86400000,
        summary: "Interesse em automação de vendas"
      }
    ],
    contacts: [
      {
        _id: "contact-1",
        name: "João Silva",
        channel: "whatsapp",
        externalId: "5511999999999@s.whatsapp.net",
        lastMessageAt: Date.now() - 3600000,
        createdAt: Date.now() - 86400000
      }
    ],
    recentMessages: [
      {
        _id: "msg-1",
        contactId: "contact-1",
        direction: "inbound" as const,
        text: "Olá, tenho interesse no produto",
        createdAt: Date.now() - 3600000
      }
    ],
    isLoading: false,
    error: null
  };
}