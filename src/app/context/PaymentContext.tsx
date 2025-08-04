"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { toast } from "sonner";

interface PaymentContextType {
  subscription: any;
  payments: any[];
  creditHistory: any;
  loading: boolean;
  autoRenewEnabled: boolean;
  nextBillingDate: string | null;
  subscriptionStatus: string;
  createSubscription: (productId: string, planType: string) => Promise<void>;
  refreshPaymentData: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  enableAutoRenew: () => Promise<void>;
  updatePaymentMethod: () => Promise<void>;
  getSubscriptionHealth: () => Promise<any>;
  downloadInvoice: (paymentId: string) => Promise<void>;
  getPaymentDetails: (paymentId: string) => Promise<any>;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [creditHistory, setCreditHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRenewEnabled, setAutoRenewEnabled] = useState(true);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState("free");

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSubscription(null);
        setPayments([]);
        setCreditHistory(null);
        setSubscriptionStatus("free");
        setNextBillingDate(null);
        setAutoRenewEnabled(true);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/payments/subscription-status", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setPayments(data.payments || []);
        setCreditHistory(data.creditHistory);
        
        // Update subscription status and auto-renew info
        if (data.subscription) {
          setSubscriptionStatus(data.subscription.status || "free");
          setNextBillingDate(data.subscription.next_billing_date || null);
          // Auto-renewal is always enabled for active subscriptions unless explicitly cancelled
          setAutoRenewEnabled(data.subscription.status === "active" && !data.subscription.cancel_at_next_billing_date);
        } else {
          setSubscriptionStatus("free");
          setNextBillingDate(null);
          setAutoRenewEnabled(true); // Default to enabled
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        // Set default values when API fails
        setSubscription(null);
        setPayments([]);
        setCreditHistory(null);
        setSubscriptionStatus("free");
        setNextBillingDate(null);
        setAutoRenewEnabled(true); // Default to enabled
      }
    } catch (error) {
      // Set default values when API fails
      setSubscription(null);
      setPayments([]);
      setCreditHistory(null);
      setSubscriptionStatus("free");
      setNextBillingDate(null);
      setAutoRenewEnabled(true); // Default to enabled
    } finally {
      setLoading(false);
    }
  };

  const createSubscription = async (productId: string, planType: string) => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to subscribe");
        return;
      }

      // Store user data for session recovery after payment redirect
      localStorage.setItem('yoklick_user_id', session.user.id);
      localStorage.setItem('yoklick_user_email', session.user.email || '');
      localStorage.setItem('yoklick_session_token', session.access_token);

      const response = await fetch("/api/payments/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planType }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.checkout_url) {
          // Redirect to Dodo Payments checkout
          window.location.href = data.checkout_url;
        } else {
          toast.error("Failed to create checkout URL");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to create subscription");
      }
    } catch (error) {
      toast.error("Failed to create subscription");
    }
  };

  const refreshPaymentData = async () => {
    await fetchPaymentData();
  };

  const cancelSubscription = async () => {
    try {
      if (!subscription?.subscription_id) {
        toast.error("No active subscription found");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to manage your subscription");
        return;
      }

      const response = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.subscription_id }),
      });

      if (response.ok) {
        toast.success("Subscription cancelled successfully");
        await refreshPaymentData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to cancel subscription");
      }
    } catch (error) {
      toast.error("Failed to cancel subscription");
    }
  };

  const enableAutoRenew = async () => {
    try {
      if (!subscription?.subscription_id) {
        toast.error("No active subscription found");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to manage your subscription");
        return;
      }

      const response = await fetch("/api/payments/enable-auto-renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.subscription_id }),
      });

      if (response.ok) {
        setAutoRenewEnabled(true);
        toast.success("Auto-renewal enabled successfully");
        await refreshPaymentData();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to enable auto-renewal");
      }
    } catch (error) {
      toast.error("Failed to enable auto-renewal");
    }
  };

  const updatePaymentMethod = async () => {
    try {
      if (!subscription?.subscription_id) {
        toast.error("No active subscription found");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to manage your subscription");
        return;
      }

      const response = await fetch("/api/payments/update-payment-method", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subscriptionId: subscription.subscription_id }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.update_url) {
          window.location.href = data.update_url;
        } else {
          toast.error("Failed to generate payment method update URL");
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update payment method");
      }
    } catch (error) {
      toast.error("Failed to update payment method");
    }
  };

  const getSubscriptionHealth = async () => {
    try {
      if (!subscription?.subscription_id) {
        return { status: "no_subscription", message: "No active subscription" };
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { status: "error", message: "Not authenticated" };
      }

      const response = await fetch("/api/payments/subscription-health", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        return { status: "error", message: "Failed to check subscription health" };
      }
    } catch (error) {
      return { status: "error", message: "Error checking subscription health" };
    }
  };

  const downloadInvoice = async (paymentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please sign in to download invoice");
        return;
      }

      const response = await fetch(`/api/payments/download-invoice?payment_id=${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${paymentId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Invoice downloaded successfully!");
      } else {
        toast.error("Failed to download invoice");
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  const getPaymentDetails = async (paymentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in to view payment details");
      }

      const response = await fetch(`/api/payments/payment-details?payment_id=${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error("Failed to fetch payment details");
      }
    } catch (error) {
      console.error("Error fetching payment details:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const value = {
    subscription,
    payments,
    creditHistory,
    loading,
    autoRenewEnabled,
    nextBillingDate,
    subscriptionStatus,
    createSubscription,
    refreshPaymentData,
    cancelSubscription,
    enableAutoRenew,
    updatePaymentMethod,
    getSubscriptionHealth,
    downloadInvoice,
    getPaymentDetails,
  };

  return (
    <PaymentContext.Provider value={value}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
} 