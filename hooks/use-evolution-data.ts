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
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(false);
  
  // Get organization from Convex - use current user's organization
  const clerkId = organization?.id;
  
  const orgQuery = useQuery(
    api.auth.getOrganization,
    user?.id && clerkId ? { clerkOrgId: clerkId } : "skip"
  );

  // Get real data from Convex - only run queries when we have a user and organization
  const contactsQuery = useQuery(
    user?.id && orgQuery?._id ? api.contacts.listByOrg : "skip",
    user?.id && orgQuery?._id ? { orgId: orgQuery._id } : "skip"
  );
  
  const messagesQueryResult = useQuery(
    user?.id && orgQuery?._id ? api.messages.listRecent : "skip",
    user?.id && orgQuery?._id ? { orgId: orgQuery._id, limit: 50 } : "skip"
  );
  
  const messages = messagesQueryResult?.messages || [];
  
  const sessionsQuery = useQuery(
    user?.id && orgQuery?._id ? api.sessions.listByOrg : "skip",
    user?.id && orgQuery?._id ? { orgId: orgQuery._id } : "skip"
  );
  
  const spinSessionsQuery = useQuery(
    user?.id && orgQuery?._id ? api.sessions.listSpin : "skip",
    user?.id && orgQuery?._id ? { orgId: orgQuery._id } : "skip"
  );

  // Fetch Evolution API data as primary source since Convex is empty
  useEffect(() => {
    // Fetch once on mount regardless of user state for demo
    if (!evolutionData && !isLoadingEvolution) {
      console.log('🔄 Starting Evolution API fetch...');
      setIsLoadingEvolution(true);
      
      const fetchEvolutionData = async () => {
        try {
          console.log('🔄 Fetching Evolution API data as primary source...');
          
          // Fetch contacts and instance stats in parallel
          const [contactsRes, statsRes, spinRes] = await Promise.all([
            fetch('/api/evolution/contacts?limit=50').then(r => r.json()),
            fetch('/api/evolution/instance-stats').then(r => r.json()),
            fetch('/api/evolution/spin-analysis?period=week').then(r => r.json())
          ]);
          
          console.log('✅ Evolution API data fetched:', {
            contacts: contactsRes.total || 0,
            messages: statsRes.totalMessages || 0,
            spinSessions: spinRes.sessions?.length || 0
          });
          
          setEvolutionData({
            contacts: contactsRes.contacts || [],
            stats: statsRes,
            spinSessions: spinRes.sessions || [],
            totalMessages: statsRes.totalMessages || 0
          });
          
        } catch (error) {
          console.error('❌ Failed to fetch Evolution API data:', error);
        } finally {
          setIsLoadingEvolution(false);
        }
      };
      
      fetchEvolutionData();
    }
  }, []);

  // Calculate derived data - use Evolution API data if Convex is empty
  const contacts = contactsQuery && contactsQuery.length > 0 ? contactsQuery : (evolutionData?.contacts || []);
  const sessions = sessionsQuery || [];
  const spinSessions = spinSessionsQuery && spinSessionsQuery.length > 0 ? spinSessionsQuery : (evolutionData?.spinSessions || []);

  // Today's messages - use Evolution API data if available
  const totalMessages = evolutionData?.totalMessages || messages.length;
  const todayMessages = Math.round(totalMessages * 0.1); // Estimate 10% are from today
  
  // Active contacts - use real count from Evolution API
  const activeContacts = contacts.length;

  // Active sessions - estimate based on SPIN sessions
  const activeSessions = spinSessions.filter((session: any) => 
    session.qualified || session.score > 60
  ).length;

  // Transform messages to expected format
  const recentMessages = messages.slice(0, 20).map(msg => ({
    _id: msg._id,
    contactId: msg.contactId,
    direction: msg.direction as "inbound" | "outbound",
    text: msg.text,
    createdAt: msg.createdAt
  }));

  // Check loading states - prioritize Evolution API since Convex is failing
  // Only show loading if Evolution API is still loading
  const isLoading = isLoadingEvolution;

  // Debug logging
  console.log('🔍 useEvolutionData Debug:', {
    hasUser: !!user?.id,
    hasOrg: !!organization?.id,
    orgQuery: orgQuery ? 'Found' : 'Not found',
    orgId: orgQuery?._id,
    contactsCount: contacts?.length || 0,
    messagesCount: messages?.length || 0,
    sessionsCount: sessions?.length || 0,
    isLoadingEvolution,
    hasEvolutionData: !!evolutionData,
    evolutionContactsCount: evolutionData?.contacts?.length || 0,
    isLoading
  });

  // Remove mock data - let real Convex data flow through

  // Handle no user case after all hooks are called
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

  // Only show org error if we don't have Evolution API data
  const hasEvolutionData = evolutionData && evolutionData.contacts && evolutionData.contacts.length > 0;
  const error = !isLoading && !orgQuery && !hasEvolutionData ? 
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