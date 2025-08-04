"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { handleAuthentication } from "@/app/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, XCircle, CreditCard, Shield, Zap, CheckCircle, Sparkles, Crown } from "lucide-react";
import { toast } from "sonner";
import { useCredits } from "@/app/context/CreditsContext";
import { usePayment } from "@/app/context/PaymentContext";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed' | 'cancelled'>('pending');
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { refreshCredits } = useCredits();
  const { refreshPaymentData } = usePayment();
  const [creditsAllocated, setCreditsAllocated] = useState(false);
  const [dynamicPlanType, setDynamicPlanType] = useState<string | null>(null);

  useEffect(() => {
    const subscriptionIds = searchParams.getAll('subscription_id');
    let alreadyProcessed = false;
    for (const subId of subscriptionIds) {
      const allocatedKey = `credits_allocated_${subId}`;
      const alreadyAllocated = localStorage.getItem(allocatedKey);
      if (alreadyAllocated === 'true') {
        alreadyProcessed = true;
        break;
      }
    }
    if (alreadyProcessed) {
      setCreditsAllocated(true);
    }
    const cleanupOldEntries = () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('credits_allocated_')) {
          const timestamp = localStorage.getItem(`${key}_timestamp`);
          if (timestamp && parseInt(timestamp) < oneHourAgo) {
            localStorage.removeItem(key);
            localStorage.removeItem(`${key}_timestamp`);
          }
        }
      });
    };
    cleanupOldEntries();
  }, [searchParams]);

  useEffect(() => {
    return () => {};
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, success } = await handleAuthentication();
        if (success && user) {
          setIsAuthenticated(true);
          setCurrentUser(user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUser(session.user);
          localStorage.setItem('yoklick_user_id', session.user.id);
          localStorage.setItem('yoklick_user_email', session.user.email || '');
          if (session.user.id) {
            const userPlan = await fetchUserPlanFromDatabase();
            if (userPlan) {
              setDynamicPlanType(userPlan);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setDynamicPlanType(null);
          localStorage.removeItem('yoklick_user_id');
          localStorage.removeItem('yoklick_user_email');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleCheckout = async () => {
      try {
        if (isAuthenticated === null) {
          return;
        }
        if (isAuthenticated === false) {
          setError('Please sign in to complete your purchase.');
          setLoading(false);
          return;
        }
        if (!currentUser) {
          setError('Authentication error. Please sign in again.');
          setLoading(false);
          return;
        }
        const subscriptionIds = searchParams.getAll('subscription_id');
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        let activeSubscriptionId = null;
        for (const subId of subscriptionIds) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) continue;
            const syncResponse = await fetch('/api/payments/sync-subscription', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ subscriptionId: subId })
            });
            const syncData = await syncResponse.json();
            if (syncData.success && syncData.subscription?.status === 'active') {
              activeSubscriptionId = subId;
              break;
            }
          } catch (error) {}
        }
        if (!activeSubscriptionId && subscriptionIds.length > 0) {
          activeSubscriptionId = subscriptionIds[subscriptionIds.length - 1];
        }
        if (!activeSubscriptionId) {
          setError('No valid subscription ID found');
          setLoading(false);
          return;
        }
        if (creditsAllocated) {
          setLoading(false);
          return;
        }
        if (status === 'success' || status === 'active' || paymentId) {
          setPaymentStatus('success');
          await updateUserSubscription(activeSubscriptionId);
        } else if (status === 'cancelled') {
          setPaymentStatus('cancelled');
        } else if (status === 'failed') {
          setPaymentStatus('failed');
        } else {
          await checkSubscriptionStatus(activeSubscriptionId);
        }
        setLoading(false);
      } catch (error) {
        setError('Something went wrong during checkout');
        setLoading(false);
      }
    };
    handleCheckout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, isAuthenticated, currentUser, creditsAllocated]);

  const checkSubscriptionStatus = async (subscriptionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Authentication required');
        setLoading(false);
        return;
      }
      const syncResponse = await fetch('/api/payments/sync-subscription', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subscriptionId })
      });
      const syncData = await syncResponse.json();
      if (syncData.success) {
        if (syncData.subscription.status === 'active') {
          setPaymentStatus('success');
          await updateUserSubscription(subscriptionId);
        } else if (syncData.subscription.status === 'pending') {
          setPaymentStatus('pending');
          setError('Payment is still processing. Please wait a moment and refresh the page.');
          toast.info('Payment is being processed. You will receive credits once the payment is confirmed.');
        } else {
          setPaymentStatus('failed');
          setError('Payment verification failed. Please contact support if you believe this is an error.');
        }
      } else {
        const response = await fetch('/api/payments/complete-payment', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ subscriptionId })
        });
        const data = await response.json();
        if (data.success) {
          if (data.status === 'success') {
            setPaymentStatus('success');
            await updateUserSubscription(subscriptionId);
          } else if (data.status === 'pending') {
            setPaymentStatus('pending');
            setError('Payment is still processing. Please wait a moment and refresh the page.');
          } else {
            setPaymentStatus('failed');
            setError(data.message || `Payment status: ${data.status}`);
          }
        } else {
          setPaymentStatus('failed');
          setError(data.error || 'Payment verification failed');
        }
      }
    } catch (error) {
      setPaymentStatus('failed');
      setError('Failed to verify payment status');
    }
  };

  const updateUserSubscription = async (subscriptionId: string) => {
    try {
      if (!currentUser) {
        return;
      }
      if (creditsAllocated) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }
      const statusResponse = await fetch('/api/payments/sync-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subscriptionId })
      });
      const statusData = await statusResponse.json();
      if (!statusData.success || statusData.subscription?.status !== 'active') {
        if (statusData.subscription?.status === 'pending') {
          toast.error('Payment is still processing. Please wait a moment and refresh the page.');
        }
        return;
      }
      try {
        await fetch('/api/payments/setup-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ userId: currentUser.id })
        });
      } catch (error) {}
      let planType = subscriptionData?.metadata?.plan_type;
      if (!planType) {
        try {
          const lookupResponse = await fetch(`/api/payments/subscription-lookup?subscription_id=${subscriptionId}`, {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          });
          if (lookupResponse.ok) {
            const lookupData = await lookupResponse.json();
            if (lookupData.success && lookupData.subscription) {
              planType = lookupData.subscription.plan_type || lookupData.subscription.metadata?.plan_type;
              if (lookupData.needsSync && currentUser) {
                await supabase
                  .from("subscriptions")
                  .insert({
                    subscription_id: subscriptionId,
                    user_id: currentUser.id,
                    status: "pending",
                    plan_type: planType,
                    amount: 0,
                    billing_cycle: "monthly",
                    created_at: new Date().toISOString(),
                    metadata: {
                      user_id: currentUser.id,
                      plan_type: planType,
                      dodo_subscription_id: subscriptionId
                    }
                  });
              }
            }
          }
        } catch (error) {}
        if (!planType) {
          const { data: dbSubscription, error: dbError } = await supabase
            .from('subscriptions')
            .select('plan_type, metadata')
            .eq('subscription_id', subscriptionId)
            .limit(1);
          if (!dbError && dbSubscription && dbSubscription.length > 0) {
            const subscription = dbSubscription[0];
            planType = subscription.plan_type || subscription.metadata?.plan_type;
          }
        }
        if (!planType) {
          try {
            const statusResponse = await fetch('/api/payments/subscription-status', {
              headers: {
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
              }
            });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.subscription?.metadata?.plan_type) {
                planType = statusData.subscription.metadata.plan_type;
              }
            }
          } catch (apiError) {}
          if (!planType) {
            const { data: { user } } = await supabase.auth.getUser();
            planType = user?.user_metadata?.plan_type;
          }
        }
      }
      if (!planType) {
        try {
          const statusResponse = await fetch('/api/payments/subscription-status', {
            headers: {
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            }
          });
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.subscription?.metadata?.plan_type) {
              planType = statusData.subscription.metadata.plan_type;
            }
          }
        } catch (apiError) {}
      }
      if (!planType) {
        const urlParams = new URLSearchParams(window.location.search);
        const planFromUrl = urlParams.get('plan');
        if (planFromUrl) {
          planType = planFromUrl;
        } else {
          const storedPlan = localStorage.getItem('selected_plan');
          if (storedPlan) {
            planType = storedPlan;
          }
        }
      }
      if (!planType) {
        await debugSubscription(subscriptionId);
        const debugResponse = await fetch('/api/payments/debug-subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ subscriptionId })
        });
        const debugResult = await debugResponse.json();
        if (debugResult.success && debugResult.debug.planType.fromDodo) {
          planType = debugResult.debug.planType.fromDodo;
        }
      }
      try {
        let creditsToAdd = 0;
        const normalizedPlanType = planType?.toLowerCase();
        if (normalizedPlanType === "starter") {
          creditsToAdd = 40;
        } else if (normalizedPlanType === "creator") {
          creditsToAdd = 100;
        } else if (normalizedPlanType === "pro") {
          creditsToAdd = 300;
        } else if (normalizedPlanType === "free") {
          return;
        } else if (normalizedPlanType === "monthly" || normalizedPlanType === "yearly") {
          if (subscriptionData?.metadata?.plan_type) {
            const metadataPlanType = subscriptionData.metadata.plan_type.toLowerCase();
            if (metadataPlanType === "starter") {
              creditsToAdd = 40;
            } else if (metadataPlanType === "creator") {
              creditsToAdd = 100;
            } else if (metadataPlanType === "pro") {
              creditsToAdd = 300;
            }
          }
        } else if (normalizedPlanType === "unknown") {
          const productId = subscriptionData?.metadata?.product_id;
          if (productId) {
            if (productId.includes("starter")) {
              creditsToAdd = 40;
            } else if (productId.includes("creator")) {
              creditsToAdd = 100;
            } else if (productId.includes("pro")) {
              creditsToAdd = 300;
            }
          }
        }
        if (creditsToAdd === 0) {
          const productIdToPlanMap: { [key: string]: string } =
            process.env.NODE_ENV === 'development'
              ? {
                  'pdt_PoCX9Im2AUmxotnYx9ydm': 'starter',
                  'pdt_RJ7OspzeWRD3XV0bqQJSn': 'starter',
                  'pdt_nzFFbBbSBVopc9gvAwGic': 'creator',
                  'pdt_0MtQNcWe0trsg2IWtMLtx': 'creator',
                  'pdt_DNbzGIiBdpqiKlrWLOj6q': 'pro',
                  'pdt_xchUmeCCUGlTCXmg7IkAP': 'pro',
                }
              : {
                  'pdt_aCeAOINH8bdnRRB6ntc3k': 'starter',
                  'pdt_N2AKdLOPAKRkx3fpcd0nY': 'starter',
                  'pdt_32QMss9DmmjfMVfYHpXCT': 'creator',
                  'pdt_tvu9CXx72UJF1T3BQHSKg': 'creator',
                  'pdt_h1pC9mPKvWleL3BH8hDBU': 'pro',
                  'pdt_aO29vTbobbKXOw22R6IiQ': 'pro',
                };
          const productId = subscriptionData?.metadata?.product_id;
          if (productId && productIdToPlanMap[productId]) {
            planType = productIdToPlanMap[productId];
            if (planType === "starter") {
              creditsToAdd = 40;
            } else if (planType === "creator") {
              creditsToAdd = 100;
            } else if (planType === "pro") {
              creditsToAdd = 300;
            }
          } else if (productId) {
            if (productId === 'pdt_PoCX9Im2AUmxotnYx9ydm' || productId === 'pdt_aCeAOINH8bdnRRB6ntc3k') {
              planType = 'starter';
              creditsToAdd = 40;
            }
          }
        }
        if (creditsToAdd === 0 || planType === 'unknown') {
          const errorMessage = planType === 'unknown'
            ? `Subscription ${subscriptionId} has unknown plan type. Please wait for payment to complete or contact support.`
            : `Could not determine plan type for subscription ${subscriptionId}. Please contact support.`;
          toast.error(errorMessage);
          return;
        }
        const allocationResult = await allocateCredits(subscriptionId, planType, creditsToAdd);
        if (allocationResult && allocationResult.success && !creditsAllocated) {
          setCreditsAllocated(true);
          const allocatedKey = `credits_allocated_${subscriptionId}`;
          localStorage.setItem(allocatedKey, 'true');
          localStorage.setItem(`${allocatedKey}_timestamp`, Date.now().toString());
          if (allocationResult.credits !== undefined) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              window.dispatchEvent(new CustomEvent('credits-updated', {
                detail: { 
                  userId: user.id,
                  newCredits: allocationResult.credits,
                  creditsAdded: allocationResult.creditsAdded
                }
              }));
            }
          }
          const toastKey = `success_toast_${subscriptionId}`;
          if (!localStorage.getItem(toastKey)) {
            toast.success(`Payment successful! 🎉 Welcome to Yoklick! Your subscription is now active.`);
            localStorage.setItem(toastKey, 'true');
            setTimeout(() => localStorage.removeItem(toastKey), 5 * 60 * 1000);
          }
        } else if (allocationResult && allocationResult.alreadyAllocated) {
          setCreditsAllocated(true);
          const allocatedKey = `credits_allocated_${subscriptionId}`;
          localStorage.setItem(allocatedKey, 'true');
          localStorage.setItem(`${allocatedKey}_timestamp`, Date.now().toString());
          const toastKey = `already_allocated_toast_${subscriptionId}`;
          if (!localStorage.getItem(toastKey)) {
            toast.info(`Payment successful! Your credits were already allocated.`);
            localStorage.setItem(toastKey, 'true');
            setTimeout(() => localStorage.removeItem(toastKey), 5 * 60 * 1000);
          }
        }
      } catch (creditError) {
        if (creditError instanceof Error && creditError.message.includes('429')) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          let creditsToAdd = 0;
          const normalizedPlanType = planType?.toLowerCase();
          if (normalizedPlanType === "starter") {
            creditsToAdd = 40;
          } else if (normalizedPlanType === "creator") {
            creditsToAdd = 100;
          } else if (normalizedPlanType === "pro") {
            creditsToAdd = 300;
          } else if (normalizedPlanType === "free") {
            return;
          }
          await allocateCredits(subscriptionId, planType, creditsToAdd);
        } else {
          throw creditError;
        }
      }
      await refreshPaymentData();
    } catch (error) {
      if (!creditsAllocated) toast.error('Failed to update subscription. Please contact support.');
    }
  };

  const allocateCredits = async (subscriptionId: string, planType: string, creditsToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to continue');
      }
      const response = await fetch('/api/payments/allocate-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId,
          planType,
          creditsToAdd,
          action: 'subscription_payment',
          userId: user.id
        })
      });
      const result = await response.json();
      if (result.success) {
        if (result.alreadyAllocated) {
          return { success: true, alreadyAllocated: true };
        } else {
          return { success: true, credits: result.credits, creditsAdded: result.creditsAdded };
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const handleRetry = () => {
    router.push('/pricing');
  };

  const getCreditsForPlan = (planType: string) => {
    const normalizedPlanType = planType?.toLowerCase();
    if (normalizedPlanType === "starter") return 40;
    if (normalizedPlanType === "creator") return 100;
    if (normalizedPlanType === "pro") return 300;
    return 0;
  };

  const getPlanDetails = (planType: string) => {
    const normalizedPlanType = planType?.toLowerCase();
    const planDetails = {
      starter: {
        name: "Starter",
        price: "$9.89",
        period: "/month",
        features: [
          "40 AI-generated thumbnails",
          "Basic text positioning",
          "Standard generation quality",
          "Email support",
          "Download in HD"
        ],
        icon: <Sparkles className="h-5 w-5" />
      },
      creator: {
        name: "Creator",
        price: "$18.89",
        period: "/month",
        features: [
          "100 AI-generated thumbnails",
          "Advanced text positioning",
          "Premium generation quality",
          "Priority email support",
          "Download in HD",
          "Bulk download feature"
        ],
        icon: <Zap className="h-5 w-5" />
      },
      pro: {
        name: "Pro",
        price: "$38.89",
        period: "/month",
        features: [
          "300 AI-generated thumbnails",
          "All text positioning options",
          "Ultra-premium generation quality",
          "24/7 priority support",
          "Download in HD",
          "Bulk download & share",
          "Custom branding options"
        ],
        icon: <Crown className="h-5 w-5" />
      }
    };
    return planDetails[normalizedPlanType as keyof typeof planDetails] || planDetails.starter;
  };

  const fetchUserPlanFromDatabase = async () => {
    if (!currentUser?.id) return null;
    try {
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('plan_type, amount, billing_cycle')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) {
        return null;
      }
      if (subscriptions && subscriptions.length > 0) {
        const latestSubscription = subscriptions[0];
        return latestSubscription.plan_type;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const getDetectedPlanType = () => {
    if (dynamicPlanType) {
      return dynamicPlanType;
    }
    if (subscriptionData?.plan_type) {
      return subscriptionData.plan_type;
    }
    if (subscriptionData?.metadata?.plan_type) {
      return subscriptionData.metadata.plan_type;
    }
    if (subscriptionData?.product_id) {
      const planFromProduct = extractPlanFromProductId(subscriptionData.product_id);
      if (planFromProduct) {
        return planFromProduct;
      }
    }
    if (subscriptionData?.metadata?.product_id) {
      const planFromProduct = extractPlanFromProductId(subscriptionData.metadata.product_id);
      if (planFromProduct) {
        return planFromProduct;
      }
    }
    if (subscriptionData?.id) {
      const planFromId = extractPlanFromProductId(subscriptionData.id);
      if (planFromId) {
        return planFromId;
      }
    }
    if (subscriptionData?.metadata?.plan) {
      return subscriptionData.metadata.plan;
    }
    if (subscriptionData?.metadata?.plan_name) {
      return subscriptionData.metadata.plan_name;
    }
    if (subscriptionData?.metadata?.name) {
      return subscriptionData.metadata.name;
    }
    if (subscriptionData?.metadata?.product_name) {
      const planFromProductName = extractPlanFromProductId(subscriptionData.metadata.product_name);
      if (planFromProductName) {
        return planFromProductName;
      }
    }
    if (subscriptionData?.id) {
      const subscriptionId = subscriptionData.id.toLowerCase();
      if (subscriptionId.includes('starter') || subscriptionId.includes('basic')) {
        return 'starter';
      }
      if (subscriptionId.includes('creator') || subscriptionId.includes('premium')) {
        return 'creator';
      }
      if (subscriptionId.includes('pro') || subscriptionId.includes('enterprise')) {
        return 'pro';
      }
    }
    if (subscriptionData?.amount) {
      const amount = parseFloat(subscriptionData.amount);
      if (amount <= 10) {
        return 'starter';
      } else if (amount <= 20) {
        return 'creator';
      } else {
        return 'pro';
      }
    }
    return 'starter';
  };

  const extractPlanFromProductId = (productId: string) => {
    if (!productId) return null;
    const normalizedProductId = productId.toLowerCase();
    if (normalizedProductId.includes('starter') || normalizedProductId.includes('basic')) {
      return 'starter';
    }
    if (normalizedProductId.includes('creator') || normalizedProductId.includes('premium')) {
      return 'creator';
    }
    if (normalizedProductId.includes('pro') || normalizedProductId.includes('enterprise')) {
      return 'pro';
    }
    if (normalizedProductId.includes('9.89') || normalizedProductId.includes('989')) {
      return 'starter';
    }
    if (normalizedProductId.includes('18.89') || normalizedProductId.includes('1889')) {
      return 'creator';
    }
    if (normalizedProductId.includes('38.89') || normalizedProductId.includes('3889')) {
      return 'pro';
    }
    if (normalizedProductId.includes('40') || normalizedProductId.includes('forty')) {
      return 'starter';
    }
    if (normalizedProductId.includes('100') || normalizedProductId.includes('hundred')) {
      return 'creator';
    }
    if (normalizedProductId.includes('300') || normalizedProductId.includes('three')) {
      return 'pro';
    }
    if (normalizedProductId.includes('monthly') || normalizedProductId.includes('month')) {
      return 'starter';
    }
    return null;
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const debugSubscription = async (subscriptionId: string) => {
    try {
      const response = await fetch('/api/payments/debug-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId })
      });
      const result = await response.json();
      if (result.success) {
        const { databaseSubscription, dodoSubscription, planType } = result.debug;
        const planTypeFound = planType.fromDatabase || planType.fromDodo;
        if (planTypeFound) {
          toast.success(`Debug: Found plan type "${planTypeFound}"`);
        } else {
          toast.error(`Debug: No plan type found for subscription ${subscriptionId}`);
        }
      } else {
        toast.error(`Debug failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Failed to debug subscription');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#171717]">
        <Card className="w-full max-w-md shadow-lg border border-border">
          <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <h2 className="text-xl font-bold mb-1">Processing Payment</h2>
            <p className="text-muted-foreground text-center text-base">
              Please wait while we confirm your payment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error === 'Please sign in to complete your purchase.' || error === 'Authentication error. Please sign in again.') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#171717]">
        <Card className="w-full max-w-md shadow-lg border border-border">
          <CardContent className="flex flex-col items-center justify-center p-8 gap-4">
            <XCircle className="h-12 w-12 text-destructive mb-2" />
            <h2 className="text-xl font-bold mb-1">Authentication Required</h2>
            <p className="text-muted-foreground text-center mb-4">
              Please sign in to complete your purchase.
            </p>
            <div className="flex gap-3 w-full mb-2">
              <Button onClick={() => router.push('/auth/signin')} className="flex-1">
                Sign In
              </Button>
              <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
                Go Home
              </Button>
            </div>
            <div className="text-center space-y-2 w-full">
              <p className="text-xs text-muted-foreground">
                If you just confirmed your email, please sign in again to continue.
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs"
                onClick={() => {
                  setError('');
                  setLoading(true);
                  handleAuthentication().then(({ user, success }) => {
                    if (success && user) {
                      setIsAuthenticated(true);
                      setCurrentUser(user);
                    } else {
                      setError('Please sign in to complete your purchase.');
                    }
                    setLoading(false);
                  });
                }}
              >
                Retry Authentication
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#171717] p-4">
      <Card className="w-full max-w-lg shadow-lg border border-border">
        <CardHeader className="text-center pb-0 pb-6">
          {paymentStatus === 'success' && (
            <>
              <Check className="h-10 w-10 text-green-800 bg-green-200 p-2 rounded-md mx-auto mb-2" />
              <CardTitle className="text-2xl font-bold text-green-800 dark:text-green-200 mb-1">Payment Successful!</CardTitle>
              <CardDescription className="text-base text-green-600 dark:text-green-400 mb-2">
                Welcome to Yoklick! Your subscription is now active.
              </CardDescription>
            </>
          )}
          {paymentStatus === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle className="text-xl font-bold text-destructive mb-1">Payment Failed</CardTitle>
              <CardDescription className="text-base text-destructive">
                We couldn't process your payment. Please try again.
              </CardDescription>
            </>
          )}
          {paymentStatus === 'cancelled' && (
            <>
              <XCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
              <CardTitle className="text-xl font-bold text-yellow-600 mb-1">Payment Cancelled</CardTitle>
              <CardDescription className="text-base text-yellow-600">
                Your payment was cancelled. No charges were made.
              </CardDescription>
            </>
          )}
          {paymentStatus === 'pending' && (
            <>
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-2" />
              <CardTitle className="text-xl font-bold text-blue-600 mb-1">Payment Processing</CardTitle>
              <CardDescription className="text-base text-blue-600">
                Your payment is being processed. Please wait a moment.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {paymentStatus === 'success' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-6 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-green-800 dark:text-green-200 text-lg">
                      Welcome to Yoklick!
                    </h3>
                    <p className="text-green-600 dark:text-green-300 text-sm">
                      Your subscription is now active and ready to use
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    What you can do now:
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Generate credit number of thumbnails</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Access all premium features</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Download high-quality images</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            {paymentStatus === 'success' ? (
              <>
                <Button onClick={handleGoHome} className="w-full bg-green-600 hover:bg-green-700 text-white">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Creating Thumbnails
                </Button>
                <Button variant="outline" onClick={handleGoHome} className="w-full">
                  Back to Home
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button variant="ghost" onClick={handleGoHome} className="w-full">
                  Back to Home
                </Button>
              </>
            )}
          </div>
          <div className="text-center text-xs text-muted-foreground">
            <p>Need help? <a href="mailto:hello@yoklick.com" className="text-blue-600 dark:text-blue-400 hover:underline">Contact our support team</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-2" />
              <CardTitle className="text-xl font-bold text-blue-600 mb-1">Loading...</CardTitle>
              <CardDescription className="text-base text-blue-600">
                Please wait while we load your checkout details.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
} 