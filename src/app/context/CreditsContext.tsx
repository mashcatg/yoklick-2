"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

// 1. Define a TypeScript interface for the context value
interface CreditsContextType {
  credits: number;
  refreshCredits: () => Promise<void>;
  subscriptionHealth: any;
  checkSubscriptionHealth: () => Promise<void>;
  autoRenewStatus: {
    enabled: boolean;
    nextBillingDate: string | null;
    daysUntilRenewal: number | null;
    needsAttention: boolean;
    attentionMessage: string | null;
  };
}

// 2. Create the context with a default value (you can use a non-null assertion here)
const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  refreshCredits: async () => {},
  subscriptionHealth: null,
  checkSubscriptionHealth: async () => {},
  autoRenewStatus: {
    enabled: true,
    nextBillingDate: null,
    daysUntilRenewal: null,
    needsAttention: false,
    attentionMessage: null,
  },
});

// 3. Create a proper prop type for the provider
interface Props {
  children: ReactNode;
}

export function CreditsProvider({ children }: Props) {
  const [credits, setCredits] = useState<number>(0);
  const [subscriptionHealth, setSubscriptionHealth] = useState<any>(null);
  const [autoRenewStatus, setAutoRenewStatus] = useState({
    enabled: true,
    nextBillingDate: null,
    daysUntilRenewal: null,
    needsAttention: false,
    attentionMessage: null,
  });

  const refreshCredits = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    const { data, error } = await supabase
      .from("users_meta")
      .select("credits")
      .eq("id", session.user.id)
      .single();

    if (error) {
      return;
    }

    if (data) {
      setCredits(data.credits);
    } else {
      setCredits(0);
    }
  };

  const checkSubscriptionHealth = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return;
    }

    try {
      // For now, skip the subscription health check since the function might not be deployed
      // TODO: Implement a simpler subscription health check
      console.log("⚠️ Subscription health check skipped - function not deployed");
      
      // Set default values
      setSubscriptionHealth(null);
      setAutoRenewStatus({
        enabled: true,
        nextBillingDate: null,
        daysUntilRenewal: null,
        needsAttention: false,
        attentionMessage: null,
      });
    } catch (error) {
      console.error("Error checking subscription health:", error);
    }
  };

  useEffect(() => {
    refreshCredits();
    checkSubscriptionHealth();
  }, []);

  // Listen for real-time credit updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const channel = supabase
        .channel('credits-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users_meta',
            filter: `id=eq.${session.user.id}`
          },
          (payload) => {
            setCredits(payload.new.credits || 0);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

  // Listen for subscription changes
  useEffect(() => {
    const setupSubscriptionRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const channel = supabase
        .channel('subscription-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${session.user.id}`
          },
          () => {
            checkSubscriptionHealth();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscriptionRealtime();
  }, []);

  // Listen for custom credit update events (for immediate updates)
  useEffect(() => {
    const handleCreditsUpdated = (event: CustomEvent) => {
      if (event.detail.newCredits !== undefined) {
        setCredits(event.detail.newCredits);
      }
    };

    window.addEventListener('credits-updated', handleCreditsUpdated as EventListener);

    return () => {
      window.removeEventListener('credits-updated', handleCreditsUpdated as EventListener);
    };
  }, []);

  // Periodic health check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      checkSubscriptionHealth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <CreditsContext.Provider value={{ 
      credits, 
      refreshCredits, 
      subscriptionHealth, 
      checkSubscriptionHealth,
      autoRenewStatus 
    }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
