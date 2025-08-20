"use client";

import { useState, useEffect } from "react";

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
  const [data, setData] = useState<DashboardData>({
    todayMessages: 0,
    activeContacts: 0,
    activeSessions: 0,
    responseTime: 3,
    spinSessions: [],
    contacts: [],
    recentMessages: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchEvolutionData = async () => {
      try {
        // Fetch all data in parallel
        const [statsResponse, messagesResponse, contactsResponse, spinResponse] = await Promise.all([
          fetch('/api/evolution/instance-stats'),
          fetch('/api/evolution/messages?period=today&limit=100'),
          fetch('/api/evolution/contacts?limit=50'),
          fetch('/api/evolution/spin-analysis?period=week')
        ]);

        // Get all responses as JSON first
        const statsData = await statsResponse.json();
        const messagesData = await messagesResponse.json();
        const contactsData = await contactsResponse.json();
        const spinData = await spinResponse.json();

        // Check for API failures and get specific error messages
        const apiErrors: string[] = [];
        
        if (!statsResponse.ok) {
          apiErrors.push(`Instance Stats: ${statsData.message || 'Failed to load'}`);
        }
        if (!messagesResponse.ok || !messagesData.success) {
          apiErrors.push(`Messages: ${messagesData.message || 'Evolution API indisponível'}`);
        }
        if (!contactsResponse.ok || !contactsData.success) {
          apiErrors.push(`Contacts: ${contactsData.message || 'Evolution API indisponível'}`);
        }
        if (!spinResponse.ok || !spinData.success) {
          apiErrors.push(`SPIN Analysis: ${spinData.message || 'Análise indisponível'}`);
        }

        // If we have any API errors, show them in the error state
        const errorMessage = apiErrors.length > 0 ? 
          `Evolution API com problemas: ${apiErrors.join('; ')}` : 
          null;

        // Use successful data, defaulting to empty arrays for failed APIs
        const stats: EvolutionStats = statsResponse.ok ? statsData : {
          totalMessages: 0, totalContacts: 0, totalChats: 0, 
          instanceStatus: 'offline', instanceName: 'N/A', 
          phoneNumber: 'N/A', profileName: 'N/A', lastUpdate: new Date().toISOString()
        };

        // Use real data from APIs
        const todayMessages = messagesData.statistics?.total || 0;
        const recentMessages = messagesData.messages || [];
        const contacts = contactsData.contacts || [];
        const spinSessions = spinData.sessions || [];

        // Transform SPIN sessions to match expected format
        const transformedSessions = spinSessions.map((session: any) => ({
          id: session.contactId,
          contactId: session.contactId,
          status: session.qualified ? "qualified" : "active",
          stage: "conversation",
          spinStage: session.currentStage,
          score: session.score,
          qualified: session.qualified,
          lastActivityAt: session.lastActivity,
          createdAt: session.lastActivity - (24 * 60 * 60 * 1000), // Estimate creation
          summary: session.summary
        }));

        setData({
          todayMessages: todayMessages,
          activeContacts: stats.totalContacts,
          activeSessions: stats.totalChats,
          responseTime: 3,
          spinSessions: transformedSessions,
          contacts: contacts,
          recentMessages: recentMessages,
          isLoading: false,
          error: errorMessage
        });
        
      } catch (error) {
        console.error("Error fetching Evolution data:", error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }));
      }
    };

    fetchEvolutionData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchEvolutionData, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
}