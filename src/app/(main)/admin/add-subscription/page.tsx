'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function AddSubscriptionPage() {
  const [subscriptionId, setSubscriptionId] = useState('sub_mnuk7PQ2NC8h974SZVEau');
  const [planType, setPlanType] = useState('creator');
  const [userId, setUserId] = useState('2d05e693-70c7-4fdd-9e6f-5fee1900f7dc');
  const [amount, setAmount] = useState('1849');
  const [status, setStatus] = useState('active');
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/add-subscription?id=${subscriptionId}`);
      const result = await response.json();
      setCheckResult(result);
      toast.success('Subscription check completed');
    } catch (error) {
      toast.error('Failed to check subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/add-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          planType,
          userId,
          amount: parseInt(amount),
          status
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Subscription added successfully!`);
      } else {
        toast.error(result.error || 'Failed to add subscription');
      }
    } catch (error) {
      toast.error('Failed to add subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Subscription</CardTitle>
          <CardDescription>
            Manually add a subscription to the database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="subscriptionId">Subscription ID</Label>
              <Input
                id="subscriptionId"
                value={subscriptionId}
                onChange={(e) => setSubscriptionId(e.target.value)}
                placeholder="sub_..."
              />
            </div>
            <div>
              <Label htmlFor="planType">Plan Type</Label>
              <Input
                id="planType"
                value={planType}
                onChange={(e) => setPlanType(e.target.value)}
                placeholder="creator"
              />
            </div>
            <div>
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-uuid"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (cents)</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1849"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="active"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={checkSubscription} disabled={loading}>
              {loading ? 'Checking...' : 'Check Subscription'}
            </Button>
            <Button onClick={addSubscription} disabled={loading} variant="default">
              {loading ? 'Adding...' : 'Add Subscription'}
            </Button>
          </div>

          {checkResult && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Check Result:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(checkResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 