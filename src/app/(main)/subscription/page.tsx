"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Calendar, 
  Zap, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Clock, 
  FileText,
  DollarSign,
  User,
  MapPin,
  CreditCard as CardIcon,
  Receipt,
  TrendingUp,
  TrendingDown,
  Crown,
  Sparkles,
  Repeat
} from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import { useCredits } from '@/app/context/CreditsContext';
import { toast } from 'sonner';

interface SubscriptionData {
  subscription_id: string;
  user_id: string;
  status: string;
  plan_type: string;
  amount: string;
  billing_cycle: string;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
  metadata: {
    addons: any[];
    billing: {
      city: string;
      state: string;
      street: string;
      country: string;
      zipcode: string;
    };
    customer: {
      name: string;
      email: string;
      customer_id: string;
    };
    quantity: number;
    on_demand: boolean;
    product_id: string;
    discount_id: string | null;
    cancelled_at: string | null;
    trial_period_days: number;
    payment_frequency_count: number;
    subscription_period_count: number;
    payment_frequency_interval: string;
    cancel_at_next_billing_date: boolean;
    subscription_period_interval: string;
  };
  currency: string;
}

interface Payment {
  payment_id: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  payment_method: string;
  card_last_four?: string;
  card_network?: string;
  card_type?: string;
  billing?: {
    city: string;
    state: string;
    street: string;
    country: string;
    zipcode: string;
  };
  customer?: {
    name: string;
    email: string;
    customer_id: string;
  };
  refunds?: any[];
  disputes?: any[];
  settlement_amount?: number;
  settlement_currency?: string;
  tax?: number;
}

interface CreditHistory {
  id: string;
  user_id: string;
  credits_added: number;
  credits_used: number;
  credits_remaining: number;
  action: string;
  subscription_id?: string;
  payment_id?: string;
  plan_type?: string;
  created_at: string;
  expires_at: string;
  metadata: any;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const { credits } = useCredits();

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please sign in to view subscription details');
        return;
      }

      // Get user's latest subscription from database
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (subError) {
        toast.error('Failed to load subscription details');
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        setLoading(false);
        return;
      }

      const subscriptionData = subscriptions[0];
      setSubscription(subscriptionData);

      // Get payments for this subscription from Dodo API
      if (subscriptionData.subscription_id) {
        try {
          const paymentsResponse = await fetch(`/api/payments/get-payments?subscription_id=${subscriptionData.subscription_id}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          if (paymentsResponse.ok) {
            const paymentsData = await paymentsResponse.json();
            setPayments(paymentsData.payments || paymentsData.items || []);
          } else {
          }
        } catch (error) {
        }
      }

      // Get credit history
      const { data: creditHistoryData, error: creditError } = await supabase
        .from('credit_history')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!creditError && creditHistoryData) {
        setCreditHistory(creditHistoryData);
      }

    } catch (error) {
      console.error('Error fetching subscription details:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchSubscriptionDetails();
    setRefreshing(false);
  };

  // const downloadInvoice = async (paymentId: string) => {
  //   try {
  //     setDownloadingInvoice(paymentId);
      
  //     const { data: { session } } = await supabase.auth.getSession();
  //     if (!session) {
  //       toast.error('Please sign in to download invoice');
  //       return;
  //     }

  //     console.log('📄 Downloading invoice for payment:', paymentId);

  //     const response = await fetch(`/api/payments/download-invoice?payment_id=${paymentId}`, {
  //       headers: {
  //         'Authorization': `Bearer ${session.access_token}`
  //       }
  //     });

  //     if (response.ok) {
  //       // Check if response is PDF
  //       const contentType = response.headers.get('content-type');
  //       console.log('📄 Response content type:', contentType);
        
  //       if (contentType && contentType.includes('application/pdf')) {
  //         const blob = await response.blob();
  //         const url = window.URL.createObjectURL(blob);
  //         const link = document.createElement('a');
  //         link.href = url;
  //         link.download = `invoice-${paymentId}.pdf`;
  //         document.body.appendChild(link);
  //         link.click();
  //         document.body.removeChild(link);
  //         window.URL.revokeObjectURL(url);
  //         toast.success('Invoice downloaded successfully!');
  //       } else {
  //         // Handle JSON error response
  //         const errorData = await response.json();
  //         console.error('📄 Error response:', errorData);
  //         toast.error(errorData.error || 'Failed to download invoice');
  //       }
  //     } else {
  //       const errorText = await response.text();
  //       toast.error(`Failed to download invoice (${response.status})`);
  //     }
  //   } catch (error) {
  //     console.error('📄 Error downloading invoice:', error);
  //     toast.error('Failed to download invoice');
  //   } finally {
  //     setDownloadingInvoice(null);
  //   }
  // };

  const viewInvoice = (paymentId: string) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';
    const invoiceUrl = `${baseUrl}/invoices/payments/${paymentId}`;
    
    console.log('📄 Opening invoice URL:', invoiceUrl);
    window.open(invoiceUrl, '_blank');
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><Check className="w-4 h-4 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-4 h-4 mr-1" />Pending</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-4 h-4 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'starter':
        return <Sparkles className="w-5 h-5 text-primary" />;
      case 'creator':
        return <Zap className="w-5 h-5 text-primary" />;
      case 'pro':
        return <Crown className="w-5 h-5 text-primary" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPlanDetails = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'starter':
        return { name: 'Starter Plan', credits: 50, price: 9.89, color: 'text-yellow-600' };
      case 'creator':
        return { name: 'Creator Plan', credits: 100, price: 18.49, color: 'text-purple-600' };
      case 'pro':
        return { name: 'Pro Plan', credits: 500, price: 38.89, color: 'text-blue-600' };
      default:
        return { name: 'Unknown Plan', credits: 0, price: 0, color: 'text-gray-600' };
    }
  };

  const calculateCreditStats = () => {
    const totalEarned = creditHistory
      .filter(credit => credit.credits_added > 0)
      .reduce((sum, credit) => sum + credit.credits_added, 0);
    
    const totalUsed = creditHistory
      .filter(credit => credit.credits_used > 0)
      .reduce((sum, credit) => sum + credit.credits_used, 0);

    return { totalEarned, totalUsed };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-0 md:px-4 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 sm:w-64" />
              <Skeleton className="h-4 w-64 sm:w-80" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>
          
          {/* Credit Statistics Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="relative overflow-hidden rounded-xl p-4 lg:p-6 border">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-16 sm:h-8 sm:w-20" />
                    <Skeleton className="h-3 w-20 sm:h-4 sm:w-24" />
                  </div>
                  <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
                </div>
                <div className="absolute top-0 right-0 w-16 h-16 lg:w-20 lg:h-20 rounded-full -translate-y-8 lg:-translate-y-10 translate-x-8 lg:translate-x-10">
                  <Skeleton className="w-full h-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
          
          {/* Cards Skeleton */}
          <div className="space-y-8">
            {/* Current Plan Card Skeleton */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-5 w-64" />
              </CardHeader>
              <CardContent className="space-y-6 px-0 dark:px-4 dark:md:px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Credits Information Card Skeleton */}
            <Card className="border-0 shadow-none">
              <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-5 w-64" />
              </CardHeader>
              <CardContent className="space-y-6 px-0 dark:px-4 dark:md:px-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-px w-full" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>

            {/* Payment History Card Skeleton */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-5 w-64" />
              </CardHeader>
              <CardContent className="px-0 dark:px-4 dark:md:px-6">
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border bg-card p-4 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 lg:gap-4">
                          <div className="relative">
                            <Skeleton className="h-10 w-10 lg:h-12 lg:w-12 rounded-full" />
                            <Skeleton className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 rounded-full" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-5 w-24 lg:h-6 lg:w-32" />
                            <Skeleton className="h-4 w-32 lg:h-5 lg:w-40" />
                            <Skeleton className="h-3 w-20 lg:h-4 lg:w-28" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 lg:gap-3">
                          <Skeleton className="h-6 w-16 lg:h-7 lg:w-20" />
                          <div className="flex gap-1">
                            <Skeleton className="h-7 w-7 lg:h-8 lg:w-8 rounded" />
                            <Skeleton className="h-7 w-7 lg:h-8 lg:w-8 rounded" />
                          </div>
                        </div>
                      </div>
                      
                      {/* Payment Details Skeleton */}
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <div className="p-2 bg-muted rounded-lg space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Credit History Card Skeleton */}
            <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-5 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="group relative overflow-hidden rounded-xl border bg-card p-4 lg:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 lg:gap-4">
                          <div className="relative">
                            <Skeleton className="h-10 w-10 lg:h-12 lg:w-12 rounded-full" />
                            <Skeleton className="absolute -top-1 -right-1 w-3 h-3 lg:w-4 lg:h-4 rounded-full" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <Skeleton className="h-5 w-24 lg:h-6 lg:w-32" />
                            <Skeleton className="h-4 w-32 lg:h-5 lg:w-40" />
                            <Skeleton className="h-3 w-20 lg:h-4 lg:w-28" />
                          </div>
                        </div>
                        <div className="text-right lg:text-left space-y-1">
                          <Skeleton className="h-5 w-16 lg:h-6 lg:w-20" />
                          <Skeleton className="h-3 w-20 lg:h-4 lg:w-24" />
                        </div>
                      </div>
                      
                      {/* Additional Details Skeleton */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-xl md:text-2xl font-semibold">Subscription Details</h1>
          <p className="text-muted-foreground">No active subscription found.</p>
          <Button onClick={() => window.location.href = '/pricing'}>
            View Plans
          </Button>
        </div>
      </div>
    );
  }

  const planDetails = getPlanDetails(subscription.plan_type);
  const creditStats = calculateCreditStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-0 md:px-4 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold">
              Subscription Details
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Manage your subscription, view payments, and track credit usage
            </p>
          </div>
          <Button 
            onClick={refreshData} 
            disabled={refreshing} 
            variant="outline"
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
                {/* Credit Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 lg:p-6 border border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">{credits || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Current Credits</p>
                </div>
                <div className="p-2 lg:p-3 bg-primary/10 rounded-full">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-primary/5 rounded-full -translate-y-6 sm:-translate-y-8 lg:-translate-y-10 translate-x-6 sm:translate-x-8 lg:translate-x-10"></div>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 p-4 lg:p-6 border border-green-500/20 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-lg lg:text-xl font-bold text-green-600 truncate">
                    {subscription.plan_type
                      ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
                      : ''}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Plan Type</p>
                </div>
                <div className="p-2 lg:p-3 bg-green-500/10 rounded-full">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-green-500/5 rounded-full -translate-y-6 sm:-translate-y-8 lg:-translate-y-10 translate-x-6 sm:translate-x-8 lg:translate-x-10"></div>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 p-4 lg:p-6 border border-orange-500/20 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm sm:text-lg lg:text-xl font-bold text-orange-600 capitalize">
                    {subscription.billing_cycle ? `${subscription.billing_cycle}ly` : ''}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Billing Cycle</p>
                </div>
                <div className="p-2 lg:p-3 bg-orange-500/10 rounded-full">
                  <Repeat className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-orange-600" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-orange-500/5 rounded-full -translate-y-6 sm:-translate-y-8 lg:-translate-y-10 translate-x-6 sm:translate-x-8 lg:translate-x-10"></div>
            </div>
            
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-4 lg:p-6 border border-blue-500/20 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-blue-600">
                    {subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Next Billing</p>
                </div>
                <div className="p-2 lg:p-3 bg-blue-500/10 rounded-full">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-blue-500/5 rounded-full -translate-y-6 sm:-translate-y-8 lg:-translate-y-10 translate-x-6 sm:translate-x-8 lg:translate-x-10"></div>
            </div>
          </div>

      {/* Current Plan Card */}
      <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6 dark:px-4 dark:md:px-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              {getPlanIcon(subscription.plan_type)}
            </div>
            Current Plan
          </CardTitle>
          <CardDescription className="text-base">
            Your active subscription and billing information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 dark:px-4 dark:md:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-xl font-semibold text-primary`}>{planDetails.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {subscription.billing_cycle} billing • {planDetails.credits} credits/month
              </p>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-xs lg:text-sm text-muted-foreground">Subscription ID</p>
              <p className="font-mono text-xs lg:text-sm bg-muted p-2 rounded break-all">{subscription.subscription_id}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs lg:text-sm text-muted-foreground">Created</p>
              <p className="text-xs lg:text-sm">{formatDate(subscription.created_at)}</p>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <p className="text-xs lg:text-sm text-muted-foreground">Next Billing</p>
              <p className="text-xs lg:text-sm">{subscription.next_billing_date ? formatDate(subscription.next_billing_date) : 'N/A'}</p>
            </div>
          </div>

          {/* Billing Information */}
          {subscription.metadata?.billing && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Billing Address
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{subscription.metadata.billing.street}</p>
                  <p>{subscription.metadata.billing.city}, {subscription.metadata.billing.state} {subscription.metadata.billing.zipcode}</p>
                  <p>{subscription.metadata.billing.country}</p>
                </div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          {subscription.metadata?.customer && (
            <div className="space-y-4">
              <Separator />
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Name:</strong> {subscription.metadata.customer.name}</p>
                  <p><strong>Email:</strong> {subscription.metadata.customer.email}</p>
                  <p><strong>Customer ID:</strong> {subscription.metadata.customer.customer_id}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credits Information */}
      <Card className="border-0 shadow-none ">
        <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Zap className="w-5 h-5" />
            </div>
            Credits Renewal
          </CardTitle>
          <CardDescription className="text-base">
            Your current credit balance and plan details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-0 dark:px-4 dark:md:px-6">
          {/* Plan Information */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold text-primary`}>{planDetails.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {subscription.billing_cycle} billing • {formatCurrency(parseInt(subscription.amount), subscription.currency)}/month
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                {planDetails.credits} credits/month
              </Badge>
            </div>
            
            {subscription.next_billing_date && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Next billing: {formatDate(subscription.next_billing_date)}</span>
              </div>
            )}
          </div>

          <Separator />

          
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-6 px-0 dark:px-4 dark:md:px-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Receipt className="w-5 h-5" />
            </div>
            Payment History
          </CardTitle>
          <CardDescription className="text-base">
            Recent payments and transactions from your subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 dark:px-4 dark:md:px-6">
          {payments.length > 0 ? (
            <div className="space-y-4">
              {payments.slice(0, 10).map((payment: any, index: number) => (
                <div key={index} className="group relative overflow-hidden rounded-xl border bg-card p-4 lg:p-6 transition-all hover:shadow-none">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="relative">
                        <div className="p-2 lg:p-3 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full">
                          <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base lg:text-lg font-semibold truncate">{formatCurrency(payment.total_amount || 0, payment.currency || 'USD')}</p>
                        <p className="text-xs lg:text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                        {payment.payment_id && (
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            ID: {payment.payment_id}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-3">
                      {getStatusBadge(payment.status || 'succeeded')}
                      <div className="flex gap-1  transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewInvoice(payment.payment_id)}
                          className="shadow-none hover:bg-transparent"
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                        {/* <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadInvoice(payment.payment_id)}
                          disabled={downloadingInvoice === payment.payment_id}
                          className="h-7 w-7 lg:h-8 lg:w-8 p-0"
                        >
                          {downloadingInvoice === payment.payment_id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </Button> */}
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs lg:text-sm">
                    <div className="space-y-2">
                      <p className="text-muted-foreground font-medium">Payment Method</p>
                      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                        <CardIcon className="w-3 h-3 lg:w-4 lg:h-4 text-muted-foreground" />
                        <span className="font-medium truncate">
                          {payment.payment_method_type || 'Card'} •••• {payment.payment_method || '****'}
                        </span>
                      </div>
                    </div>
                    
                    {payment.customer && (
                      <div className="space-y-2">
                        <p className="text-muted-foreground font-medium">Customer</p>
                        <div className="p-2 bg-muted rounded-lg">
                          <p className="font-medium truncate">{payment.customer.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{payment.customer.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  {(payment.digital_products_delivered !== undefined || payment.metadata) && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      {payment.digital_products_delivered !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${payment.digital_products_delivered ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                          <p className="text-xs text-muted-foreground">
                            {payment.digital_products_delivered ? 'Digital products delivered' : 'Digital products pending'}
                          </p>
                        </div>
                      )}
                      {payment.metadata && Object.keys(payment.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Additional metadata available
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Payment History</h3>
              <p className="text-muted-foreground mb-4">
                No payment transactions found for your subscription.
              </p>
              <Button variant="outline" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit History */}
      <Card className="border-0 shadow-none bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            Credit History
          </CardTitle>
          <CardDescription className="text-base">
            Recent credit allocations and usage tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditHistory.length > 0 ? (
            <div className="space-y-4">
              {creditHistory.slice(0, 10).map((credit: CreditHistory, index: number) => (
                <div key={index} className="group relative overflow-hidden rounded-xl border bg-card p-4 lg:p-6 transition-all hover:shadow-none">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 lg:gap-4">
                      <div className="relative">
                        <div className={`p-2 lg:p-3 rounded-full ${credit.credits_added > 0 ? 'bg-gradient-to-br from-green-500/10 to-green-500/5' : 'bg-gradient-to-br from-orange-500/10 to-orange-500/5'}`}>
                          {credit.credits_added > 0 ? (
                            <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 lg:w-5 lg:h-5 text-orange-600" />
                          )}
                        </div>
                        <div className={`absolute -top-1 -right-1 w-2 h-2 lg:w-3 lg:h-3 rounded-full border-2 border-white ${credit.credits_added > 0 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base lg:text-lg font-semibold">
                          {credit.credits_added > 0 ? `+${credit.credits_added}` : `-${credit.credits_used}`} credits
                        </p>
                        <p className="text-xs lg:text-sm text-muted-foreground">
                          {credit.action === 'subscription_payment' ? 'Subscription Payment' : 
                           credit.action === 'usage' ? 'Thumbnail Generation' :
                           credit.action === 'bonus' ? 'Bonus Credits' :
                           credit.action === 'refund' ? 'Refund' :
                           credit.action === 'expiry' ? 'Credits Expired' :
                           credit.action} • {formatDate(credit.created_at)}
                        </p>
                        {credit.plan_type && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {credit.plan_type} plan
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right lg:text-left">
                      <p className="text-base lg:text-lg font-semibold text-primary">{credit.credits_remaining} remaining</p>
                      {credit.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expires: {formatDate(credit.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Additional Details */}
                  {(credit.subscription_id || credit.payment_id) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs lg:text-sm">
                        {credit.subscription_id && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">Subscription ID</p>
                            <p className="font-mono text-xs bg-muted p-2 rounded break-all">{credit.subscription_id}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Credit History</h3>
              <p className="text-muted-foreground mb-4">
                No credit transactions found for your account.
              </p>
              <Button variant="outline" onClick={refreshData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
} 