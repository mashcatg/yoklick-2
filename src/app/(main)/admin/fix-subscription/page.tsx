'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function FixSubscriptionPage() {
  const [subscriptionId, setSubscriptionId] = useState('sub_1fKD2tDch7ml1VDe2ThWy');
  const [planType, setPlanType] = useState('creator');
  const [userId, setUserId] = useState('2d05e693-70c7-4fdd-9e6f-5fee1900f7dc');
  const [forceAllocate, setForceAllocate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const checkSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/fix-subscription?id=${subscriptionId}`);
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

  const fixSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/fix-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          planType,
          userId,
          forceAllocate
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(`Subscription fixed successfully! Added ${result.creditsAdded} credits.${result.forceAllocated ? ' (Force allocated)' : ''}`);
      } else {
        toast.error(result.error || 'Failed to fix subscription');
      }
    } catch (error) {
      toast.error('Failed to fix subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Fix Subscription</CardTitle>
          <CardDescription>
            Manually fix subscription issues and allocate credits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="forceAllocate"
              checked={forceAllocate}
              onCheckedChange={(checked) => setForceAllocate(checked)}
            />
            <Label htmlFor="forceAllocate" className="text-sm">
              Force allocate credits (even without successful payment)
            </Label>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={checkSubscription} disabled={loading}>
              {loading ? 'Checking...' : 'Check Subscription'}
            </Button>
            <Button onClick={fixSubscription} disabled={loading} variant="default">
              {loading ? 'Fixing...' : 'Fix Subscription'}
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