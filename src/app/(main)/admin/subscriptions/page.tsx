"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Crown,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';

interface Subscription {
  subscription_id: string;
  user_id: string;
  status: string;
  plan_type: string;
  created_at: string;
  next_billing_date?: string;
  amount?: number;
  billing_cycle?: string;
  user?: {
    email?: string;
    user_metadata: any;
  };
}

interface Payment {
  payment_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  plan_type: string;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      
      // Fetch subscriptions and payments in parallel
      const [subscriptionsData, paymentsData] = await Promise.all([
        fetchAllSubscriptions(),
        fetchAllPayments()
      ]);

      setSubscriptions(subscriptionsData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch subscriptions and payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllSubscriptions = async (): Promise<Subscription[]> => {
    try {
      // Fetch from our backend API route
      const response = await fetch('/api/admin/dodo-subscriptions');

      if (!response.ok) {
        throw new Error(`Failed to fetch subscriptions: ${response.status}`);
      }

      const data = await response.json();
      const subscriptions = data.items || [];

      // Transform Dodo data to our format
      return subscriptions.map((sub: any) => ({
        subscription_id: sub.subscription_id,
        user_id: sub.metadata?.user_id || 'unknown',
        status: sub.status,
        plan_type: sub.metadata?.plan_type || 'unknown',
        created_at: sub.created_at,
        next_billing_date: sub.next_billing_date,
        amount: sub.recurring_pre_tax_amount,
        billing_cycle: sub.subscription_period_interval?.toLowerCase(),
        user: {
          email: sub.customer?.email,
          user_metadata: {
            name: sub.customer?.name
          }
        }
      }));
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }
  };

  const fetchAllPayments = async (): Promise<Payment[]> => {
    try {
      // Fetch from our backend API route
      const response = await fetch('/api/admin/dodo-payments');

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status}`);
      }

      const data = await response.json();
      const payments = data.items || [];

      // Transform Dodo data to our format
      return payments.map((payment: any) => ({
        payment_id: payment.payment_id,
        user_id: payment.metadata?.user_id || 'unknown',
        amount: payment.total_amount,
        status: payment.status || 'unknown',
        created_at: payment.created_at,
        plan_type: payment.metadata?.plan_type || 'unknown'
      }));
    } catch (error) {
      console.error("Error fetching payments:", error);
      throw error;
    }
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (error) throw error;

      toast.success('Subscription cancelled successfully');
      fetchSubscriptions(); // Refresh data
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const reactivateSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (error) throw error;

      toast.success('Subscription reactivated successfully');
      fetchSubscriptions(); // Refresh data
    } catch (error) {
      toast.error('Failed to reactivate subscription');
    }
  };

  const deleteSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to delete this subscription? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('subscription_id', subscriptionId);

      if (error) throw error;

      toast.success('Subscription deleted successfully');
      fetchSubscriptions(); // Refresh data
    } catch (error) {
      toast.error('Failed to delete subscription');
    }
  };

  const exportSubscriptions = () => {
    const csvContent = [
      ['User Email', 'Plan Type', 'Status', 'Amount', 'Created At', 'Next Billing', 'Billing Cycle'],
      ...filteredSubscriptions.map(s => [
        s.user?.email || 'Unknown',
        s.plan_type,
        s.status,
        s.amount ? `$${(s.amount / 100).toFixed(2)}` : 'N/A',
        new Date(s.created_at).toLocaleDateString(),
        s.next_billing_date ? new Date(s.next_billing_date).toLocaleDateString() : 'N/A',
        s.billing_cycle || 'N/A'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'pro': return <Crown className="h-4 w-4" />;
      case 'creator': return <CreditCard className="h-4 w-4" />;
      case 'starter': return <Sparkles className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'cancelled': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'default';
      case 'creator': return 'secondary';
      case 'starter': return 'outline';
      default: return 'outline';
    }
  };

  // Get detailed subscription information
  const getSubscriptionDetails = async (subscriptionId: string) => {
    try {
      const response = await fetch(`/api/admin/dodo-subscription-details?subscription_id=${subscriptionId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching subscription details:", error);
      throw error;
    }
  };

  // Get detailed payment information
  const getPaymentDetails = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/admin/dodo-payment-details?payment_id=${paymentId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch payment details: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching payment details:", error);
      throw error;
    }
  };

  const subscriptionColumns = [
    {
      key: 'subscription_id',
      label: 'Subscription ID',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="font-mono text-xs">{row.subscription_id}</div>
      )
    },
    {
      key: 'user',
      label: 'Customer',
      render: (value: any, row: any) => (
        <div>
          <p className="font-medium">{row.user?.email || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">ID: {row.user_id?.slice(0, 8)}...</p>
        </div>
      )
    },
    {
      key: 'plan_type',
      label: 'Plan',
      sortable: true,
      render: (value: any, row: any) => (
        <Badge variant={getPlanColor(row.plan_type)} className="text-xs">
          {getPlanIcon(row.plan_type)} {row.plan_type}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any, row: any) => (
        <Badge variant={getStatusColor(row.status)} className="text-xs">
          {getStatusIcon(row.status)} {row.status}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: any, row: any) => (
        <div>
          <span className="font-medium">${(row.amount || 0) / 100}</span>
          <p className="text-xs text-muted-foreground">{row.billing_cycle || 'monthly'}</p>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedSubscription(row);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => deleteSubscription(row.subscription_id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  const paymentColumns = [
    {
      key: 'payment_id',
      label: 'Payment ID',
      sortable: true,
      render: (value: any, row: any) => (
        <div className="font-mono text-xs">{row.payment_id}</div>
      )
    },
    {
      key: 'user_id',
      label: 'Customer',
      render: (value: any, row: any) => (
        <div>
          <p className="text-xs text-muted-foreground">ID: {row.user_id?.slice(0, 8)}...</p>
        </div>
      )
    },
    {
      key: 'plan_type',
      label: 'Plan',
      sortable: true,
      render: (value: any, row: any) => (
        <Badge variant={getPlanColor(row.plan_type)} className="text-xs">
          {getPlanIcon(row.plan_type)} {row.plan_type}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any, row: any) => (
        <Badge variant={getStatusColor(row.status)} className="text-xs">
          {getStatusIcon(row.status)} {row.status}
        </Badge>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (value: any, row: any) => (
        <div>
          <span className="font-medium">${(row.amount || 0) / 100}</span>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (value: any) => new Date(value).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedSubscription(row);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.plan_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    const matchesPlan = planFilter === 'all' || sub.plan_type === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const stats = {
    totalSubscriptions: subscriptions.length,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
    cancelledSubscriptions: subscriptions.filter(s => s.status === 'cancelled').length,
    totalRevenue: payments.reduce((sum, payment) => sum + (payment.amount || 0), 0),
    monthlyRevenue: payments
      .filter(payment => {
        const paymentDate = new Date(payment.created_at);
        const now = new Date();
        return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Subscription Management</h1>
            <p className="text-muted-foreground">Monitor and manage all subscriptions</p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={exportSubscriptions} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={fetchSubscriptions} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                All subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.cancelledSubscriptions}</div>
              <p className="text-xs text-muted-foreground">
                Cancelled subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                All time revenue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(stats.monthlyRevenue / 100).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* DataTable */}
        <DataTable
          data={subscriptions}
          columns={subscriptionColumns}
          title="All Subscriptions"
          searchPlaceholder="Search subscriptions by user email or plan..."
          itemsPerPage={15}
        />

        {/* Subscription Details Modal */}
        {showDetailsModal && selectedSubscription && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">User Email</label>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.user?.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Plan Type</label>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.plan_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedSubscription.amount ? `$${(selectedSubscription.amount / 100).toFixed(2)}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Billing Cycle</label>
                  <p className="text-sm text-muted-foreground">{selectedSubscription.billing_cycle || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Created At</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedSubscription.created_at).toLocaleDateString()} at{' '}
                    {new Date(selectedSubscription.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {selectedSubscription.next_billing_date && (
                  <div>
                    <label className="text-sm font-medium">Next Billing Date</label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedSubscription.next_billing_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 