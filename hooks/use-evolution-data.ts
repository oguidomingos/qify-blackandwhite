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
  
  // Get organization from Convex
  const orgQuery = useQuery(api.organizations.getByClerkId, {
    clerkId: organization?.id || user?.id || ""
  });

  // Get real data from Convex
  const contactsQuery = useQuery(orgQuery ? api.contacts.listByOrg : "skip", {
    orgId: orgQuery?._id
  });
  
  const messagesQueryResult = useQuery(orgQuery ? api.messages.listRecent : "skip", {
    orgId: orgQuery?._id,
    limit: 50
  });
  
  const messages = messagesQueryResult?.messages || [];
  
  const sessionsQuery = useQuery(orgQuery ? api.sessions.listByOrg : "skip", {
    orgId: orgQuery?._id
  });
  
  const spinSessionsQuery = useQuery(orgQuery ? api.sessions.listSpin : "skip", {
    orgId: orgQuery?._id
  });

  // Calculate derived data
  const contacts = contactsQuery || [];
  const sessions = sessionsQuery || [];
  const spinSessions = spinSessionsQuery || [];

  // Today's messages
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMessages = messages.filter(msg => 
    msg.createdAt >= today.getTime()
  ).length;

  // Active contacts (with messages in last 24h)
  const yesterday = Date.now() - (24 * 60 * 60 * 1000);
  const activeContacts = contacts.filter(contact => 
    messages.some(msg => 
      msg.contactId === contact._id && msg.createdAt >= yesterday
    )
  ).length;

  // Active sessions
  const activeSessions = sessions.filter(session => 
    session.status === 'active'
  ).length;

  // Transform messages to expected format
  const recentMessages = messages.slice(0, 20).map(msg => ({
    _id: msg._id,
    contactId: msg.contactId,
    direction: msg.direction as "inbound" | "outbound",
    text: msg.text,
    createdAt: msg.createdAt
  }));

  // Check loading states
  const isLoading = orgQuery === undefined || 
                   contactsQuery === undefined || 
                   messagesQueryResult === undefined || 
                   sessionsQuery === undefined ||
                   spinSessionsQuery === undefined;

  const error = !isLoading && !orgQuery ? 
    "Organização não encontrada. Faça o onboarding primeiro." : null;

  return {
    todayMessages,
    activeContacts,
    activeSessions,
    responseTime: 3,
    spinSessions: spinSessions || [],
    contacts: contacts || [],
    recentMessages,
    isLoading,
    error
  };
}