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
        // Fetch real Evolution API stats
        const response = await fetch('/api/evolution/instance-stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch Evolution data');
        }
        
        const stats: EvolutionStats = await response.json();
        
        // Transform Evolution data into dashboard format
        const today = new Date();
        const todayMessages = Math.floor(stats.totalMessages * 0.1); // Estimate 10% today
        
        // Create mock contacts based on real count
        const contacts = Array.from({ length: stats.totalContacts }, (_, i) => ({
          _id: `contact-${i + 1}`,
          name: `Contato ${i + 1}`,
          channel: "whatsapp",
          externalId: `55619994${String(49983 + i).padStart(5, '0')}@s.whatsapp.net`,
          lastMessageAt: Date.now() - (i * 3600000), // Stagger by hours
          createdAt: Date.now() - (i * 86400000) // Stagger by days
        }));
        
        // Create mock recent messages
        const recentMessages = Array.from({ length: Math.min(10, todayMessages) }, (_, i) => ({
          _id: `message-${i + 1}`,
          contactId: contacts[i % contacts.length]._id,
          direction: (i % 3 === 0 ? "inbound" : "outbound") as "inbound" | "outbound",
          text: i % 3 === 0 
            ? `Olá! Tenho interesse no seu produto/serviço` 
            : `Obrigado pelo interesse! Vou te enviar mais informações.`,
          createdAt: Date.now() - (i * 600000) // Stagger by 10 minutes
        }));
        
        // Create SPIN sessions with realistic data
        const spinSessions = Array.from({ length: stats.totalChats }, (_, i) => {
          const stages = ["S", "P", "I", "N"];
          const spinStage = stages[i % 4];
          const score = Math.floor(Math.random() * 40) + 60; // 60-100 score
          
          return {
            id: `session-${i + 1}`,
            contactId: contacts[i % contacts.length]._id,
            status: "active",
            stage: "conversation",
            spinStage,
            score,
            qualified: score >= 70,
            lastActivityAt: Date.now() - (i * 3600000),
            createdAt: Date.now() - (i * 86400000),
            summary: spinStage === "N" ? `Lead qualificado com score ${score}` : undefined
          };
        });
        
        setData({
          todayMessages,
          activeContacts: stats.totalContacts,
          activeSessions: stats.totalChats,
          responseTime: 3,
          spinSessions,
          contacts,
          recentMessages,
          isLoading: false,
          error: null
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