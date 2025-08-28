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

  // Get organization from Convex - always use roigem as fallback
  const knownWorkingOrgId = "org_2q8YpFZMrO9Cp80q6mGgRk2hHyT"; // roigem org
  const clerkId = organization?.id || knownWorkingOrgId;
  
  const orgQuery = useQuery(
    api.auth.getOrganization,
    { clerkOrgId: clerkId }
  );

  // Get real data from Convex - only run queries when we have an organization
  const contactsQuery = useQuery(
    orgQuery?._id ? api.contacts.listByOrg : undefined,
    orgQuery?._id ? { orgId: orgQuery._id } : undefined
  );
  
  const messagesQueryResult = useQuery(
    orgQuery?._id ? api.messages.listRecent : undefined,
    orgQuery?._id ? { orgId: orgQuery._id, limit: 50 } : undefined
  );
  
  const messages = messagesQueryResult?.messages || [];
  
  const sessionsQuery = useQuery(
    orgQuery?._id ? api.sessions.listByOrg : undefined,
    orgQuery?._id ? { orgId: orgQuery._id } : undefined
  );
  
  const spinSessionsQuery = useQuery(
    orgQuery?._id ? api.sessions.listSpin : undefined,
    orgQuery?._id ? { orgId: orgQuery._id } : undefined
  );

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
                   (orgQuery && (
                     contactsQuery === undefined || 
                     messagesQueryResult === undefined || 
                     sessionsQuery === undefined ||
                     spinSessionsQuery === undefined
                   ));

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