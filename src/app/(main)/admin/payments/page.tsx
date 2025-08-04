"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Receipt,
  TrendingUp,
  TrendingDown,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';

interface Payment {
  payment_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  plan_type: string;
  subscription_id?: string;
  currency: string;
  customer?: {
    name?: string;
    email?: string;
    customer_id?: string;
  };
  billing?: {
    city?: string;
    state?: string;
    street?: string;
    country?: string;
    zipcode?: string;
  };
  card_last_four?: string;
  card_network?: string;
  card_type?: string;
  refunds?: any[];
  disputes?: any[];
  settlement_amount?: number;
  settlement_currency?: string;
  tax?: number;
  total_amount: number;
  payment_method: string;
}

interface Subscription {
  subscription_id: string;
  user_id: string;
  status: string;
  plan_type: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlan, setFilterPlan] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscriptions from database
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to access admin panel');
        return;
      }

      // Get subscriptions from database
      const { data: subscriptionsData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subError) {
        console.error('Error fetching subscriptions:', subError);
      } else {
        setSubscriptions(subscriptionsData || []);
      }

      // Get transactions from database
      let transactionsData = [];
      try {
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (!txError && transactions) {
          transactionsData = transactions;
        }
      } catch (error) {
        console.log('Transactions table not available');
      }

      // Transform data to payments format
      const transformedPayments = transactionsData.map((tx: any) => ({
        payment_id: tx.payment_id || tx.id,
        user_id: tx.user_id,
        amount: tx.amount || tx.total_amount,
        total_amount: tx.amount || tx.total_amount,
        status: tx.status || 'succeeded',
        created_at: tx.created_at,
        plan_type: tx.plan_type || 'unknown',
        subscription_id: tx.subscription_id,
        currency: tx.currency || 'USD',
        customer: tx.customer,
        billing: tx.billing,
        card_last_four: tx.card_last_four,
        card_network: tx.card_network,
        card_type: tx.card_type,
        refunds: tx.refunds,
        disputes: tx.disputes,
        settlement_amount: tx.settlement_amount,
        settlement_currency: tx.settlement_currency,
        tax: tx.tax,
        payment_method: tx.payment_method || 'Card'
      }));

      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const downloadInvoice = async (paymentId: string) => {
    try {
      setDownloadingInvoice(paymentId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to download invoice');
        return;
      }

      const response = await fetch(`/api/payments/download-invoice?payment_id=${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
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
        toast.success('Invoice downloaded successfully!');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const getPaymentDetails = async (paymentId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to view payment details');
      }

      const response = await fetch(`/api/payments/payment-details?payment_id=${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error('Failed to fetch payment details');
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'succeeded':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'cancelled':
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const getPlanBadge = (planType: string) => {
    switch (planType?.toLowerCase()) {
      case 'creator':
        return <Badge className="bg-blue-100 text-blue-800">Creator</Badge>;
      case 'pro':
        return <Badge className="bg-purple-100 text-purple-800">Pro</Badge>;
      case 'enterprise':
        return <Badge className="bg-orange-100 text-orange-800">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">{planType || 'Unknown'}</Badge>;
    }
  };

  // Filter payments based on search and filters
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchTerm === '' || 
      payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.customer?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || payment.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesPlan = filterPlan === 'all' || payment.plan_type.toLowerCase() === filterPlan.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Calculate statistics
  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const activePayments = payments.filter(p => p.status === 'succeeded').length;
  const pendingPayments = payments.filter(p => p.status === 'pending').length;
  const failedPayments = payments.filter(p => p.status === 'failed').length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Payments</h1>
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Payments</h1>
        <Button onClick={refreshData} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              From {payments.length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Payments</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activePayments}</div>
            <p className="text-xs text-muted-foreground">
              Successful transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPayments}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedPayments}</div>
            <p className="text-xs text-muted-foreground">
              Failed transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="succeeded">Succeeded</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Plans</option>
              <option value="creator">Creator</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length > 0 ? (
            <div className="space-y-4">
              {filteredPayments.map((payment, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <DollarSign className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{formatCurrency(payment.total_amount, payment.currency)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(payment.status)}
                      {getPlanBadge(payment.plan_type)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadInvoice(payment.payment_id)}
                        disabled={downloadingInvoice === payment.payment_id}
                      >
                        {downloadingInvoice === payment.payment_id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowDetailsModal(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Payment Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Payment ID</p>
                      <p className="font-mono text-xs">{payment.payment_id}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs">{payment.user_id}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-muted-foreground">Payment Method</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {payment.card_type} •••• {payment.card_last_four}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {payment.customer && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm font-medium">{payment.customer.name}</span>
                        <span className="text-sm text-muted-foreground">{payment.customer.email}</span>
                      </div>
                    </div>
                  )}

                  {/* Additional Details */}
                  {(payment.settlement_amount || payment.tax || (payment.refunds && payment.refunds.length > 0) || (payment.disputes && payment.disputes.length > 0)) && (
                    <div className="pt-3 border-t space-y-2">
                      {payment.settlement_amount && (
                        <p className="text-xs text-muted-foreground">
                          Settlement: {formatCurrency(payment.settlement_amount, payment.settlement_currency || payment.currency)}
                        </p>
                      )}
                      {payment.tax && (
                        <p className="text-xs text-muted-foreground">
                          Tax: {formatCurrency(payment.tax, payment.currency)}
                        </p>
                      )}
                      {payment.refunds && payment.refunds.length > 0 && (
                        <p className="text-xs text-orange-600">
                          {payment.refunds.length} refund(s) processed
                        </p>
                      )}
                      {payment.disputes && payment.disputes.length > 0 && (
                        <p className="text-xs text-red-600">
                          {payment.disputes.length} dispute(s) open
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No payments found</p>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Payment Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment ID</p>
                  <p className="font-mono text-sm">{selectedPayment.payment_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(selectedPayment.total_amount, selectedPayment.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  {getPlanBadge(selectedPayment.plan_type)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm">{formatDate(selectedPayment.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{selectedPayment.user_id}</p>
                </div>
              </div>

              {selectedPayment.customer && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="text-sm">{selectedPayment.customer.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedPayment.customer.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedPayment.billing && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Billing Address</h3>
                  <div className="text-sm space-y-1">
                    <p>{selectedPayment.billing.street}</p>
                    <p>{selectedPayment.billing.city}, {selectedPayment.billing.state} {selectedPayment.billing.zipcode}</p>
                    <p>{selectedPayment.billing.country}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 