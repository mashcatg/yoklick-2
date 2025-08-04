"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Crown, Star, CreditCard, Clock, Users, Loader2, AlertCircle, CheckCircle, MessageSquare, Download } from 'lucide-react';
import { toast } from 'sonner';
import { usePayment } from '@/app/context/PaymentContext';
import { supabase } from '@/app/lib/supabaseClient';
import { storeUserDataForRedirect } from '@/app/lib/authUtils';

// Helper function to get the correct product ID based on environment
const getProductId = (baseName: string) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const envPrefix = isDevelopment ? '' : 'LIVE_';
  const envVarName = `NEXT_PUBLIC_DODO_${envPrefix}${baseName}_PRODUCT_ID`;
  const productId = process.env[envVarName] || `${baseName.toLowerCase()}-${isDevelopment ? 'dev' : 'prod'}`;
  
  // Debug logging
  console.log(`getProductId(${baseName}):`, {
    isDevelopment,
    envPrefix,
    envVarName,
    productId,
    hasEnvVar: !!process.env[envVarName]
  });
  
  return productId;
};

interface Plan {
  name: string;
  price: string;
  credits: string;
  productId: string;
  features: string[];
  popular?: boolean;
  period?: string;
  savings?: string;
  icon: React.ReactNode;
}

const PLANS: { monthly: Plan[], yearly: Plan[] } = {
  monthly: [
    {
      name: "Starter",
      price: "$9.89",
      credits: "40 credits",
      period: "/month",
      productId: getProductId("STARTER_MONTHLY"),
      features: [
        "40 AI-generated thumbnails",
        "Basic text positioning",
        "Standard generation quality",
        "Email support",
        "Download in HD"
      ],
      icon: <Sparkles className="h-6 w-6" />
    },
    {
      name: "Creator",
      price: "$18.89",
      credits: "100 credits",
      productId: getProductId("CREATOR_MONTHLY"),
      popular: true,
      features: [
        "100 AI-generated thumbnails",
        "Advanced text positioning",
        "Premium generation quality",
        "Priority email support",
        "Download in HD",
        "Bulk download feature"
      ],
      icon: <Zap className="h-6 w-6" />
    },
    {
      name: "Pro",
      price: "$38.89",
      credits: "300 credits",
      productId: getProductId("PRO_MONTHLY"),
      features: [
        "300 AI-generated thumbnails",
        "All text positioning options",
        "Ultra-premium generation quality",
        "24/7 priority support",
        "Download in HD",
        "Bulk download & share",
        "Custom branding options"
      ],
      icon: <Crown className="h-6 w-6" />
    }
  ],
  yearly: [
    {
      name: "Starter",
      price: "$83.00",
      period: "/year",
      savings: "Save 30%",
      credits: "40 credits/month",
      productId: getProductId("STARTER_YEARLY"),
      features: [
        "40 AI-generated thumbnails",
        "Basic text positioning",
        "Standard generation quality",
        "Email support",
        "Download in HD"
      ],
      icon: <Sparkles className="h-6 w-6" />
    },
    {
      name: "Creator",
      price: "$158.00",
      period: "/year",
      savings: "Save 30%",
      credits: "100 credits/month",
      productId: getProductId("CREATOR_YEARLY"),
      popular: true,
      features: [
        "100 AI-generated thumbnails",
        "Advanced text positioning",
        "Premium generation quality",
        "Priority email support",
        "Download in HD",
        "Bulk download feature"
      ],
      icon: <Zap className="h-6 w-6" />
    },
    {
      name: "Pro",
      price: "$326.00",
      period: "/year",
      savings: "Save 30%",
      credits: "300 credits/month",
      productId: getProductId("PRO_YEARLY"),
      features: [
        "300 AI-generated thumbnails",
        "All text positioning options",
        "Ultra-premium generation quality",
        "24/7 priority support",
        "Download in HD",
        "Bulk download & share",
        "Custom branding options"
      ],
      icon: <Crown className="h-6 w-6" />
    }
  ]
};

interface PaymentStatus {
  step: 'idle' | 'creating' | 'redirecting' | 'processing' | 'success' | 'error';
  message: string;
  planName?: string;
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    step: 'idle',
    message: ''
  });
  const { createSubscription } = usePayment();

  // Debug environment variables
  useEffect(() => {
    console.log('Environment Variables Debug:', {
      NODE_ENV: process.env.NODE_ENV,
      CREATOR_MONTHLY: process.env.NEXT_PUBLIC_DODO_CREATOR_MONTHLY_PRODUCT_ID,
      LIVE_CREATOR_MONTHLY: process.env.NEXT_PUBLIC_DODO_LIVE_CREATOR_MONTHLY_PRODUCT_ID,
      STARTER_MONTHLY: process.env.NEXT_PUBLIC_DODO_STARTER_MONTHLY_PRODUCT_ID,
      PRO_MONTHLY: process.env.NEXT_PUBLIC_DODO_PRO_MONTHLY_PRODUCT_ID
    });
    
    // Test product ID resolution
    console.log('Product ID Tests:', {
      creatorMonthly: getProductId("CREATOR_MONTHLY"),
      starterMonthly: getProductId("STARTER_MONTHLY"),
      proMonthly: getProductId("PRO_MONTHLY")
    });
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      toast.error("Please sign in to subscribe");
      return;
    }

    setPaymentStatus({
      step: 'creating',
      message: 'Proceeding...',
      planName: plan.name
    });

    try {
      // Step 1: Create subscription
      setPaymentStatus({
        step: 'creating',
        message: 'Proceeding...',
        planName: plan.name
      });

      await createSubscription(plan.productId, plan.name.toLowerCase());
      
      // Step 2: Redirect to payment
      setPaymentStatus({
        step: 'redirecting',
        message: 'Redirecting...',
        planName: plan.name
      });

      toast.success("Redirecting to payment...");
      
      // Store user data for potential redirects
      storeUserDataForRedirect(user.id, user.email || '');
      
      // Step 3: Processing (this will be handled by the checkout page)
      setPaymentStatus({
        step: 'processing',
        message: 'Processing...',
        planName: plan.name
      });

    } catch (error) {
      
      setPaymentStatus({
        step: 'error',
        message: 'Failed to create subscription. Please try again.',
        planName: plan.name
      });
      
      toast.error("Failed to create subscription");
    }
  };

  const isPaymentConfigured = () => {
    return process.env.NEXT_PUBLIC_DODO_PUBLISHABLE_KEY && 
           getProductId("STARTER_MONTHLY");
  };

  const getCurrentPlan = () => {
    if (!subscription) return null;
    return subscription.metadata?.plan_type || subscription.plan_type;
  };

  const isCurrentPlan = (planName: string) => {
    const currentPlan = getCurrentPlan();
    return currentPlan?.toLowerCase().includes(planName.toLowerCase());
  };

  const getPlanStatus = (plan: Plan) => {
    if (isCurrentPlan(plan.name)) {
      return "Current Plan";
    }
    return "Subscribe";
  };

  const getPaymentButtonContent = (plan: Plan) => {
    const isCurrent = isCurrentPlan(plan.name);
    const isProcessing = paymentStatus.step !== 'idle' && paymentStatus.planName === plan.name;

    if (isCurrent) {
      return (
        <>
          <CheckCircle className="h-4 w-4 mr-2" />
          Current Plan
        </>
      );
    }

    if (isProcessing) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {paymentStatus.message}
        </>
      );
    }

    return "Subscribe";
  };

  const getPaymentButtonVariant = (plan: Plan) => {
    const isCurrent = isCurrentPlan(plan.name);
    const isProcessing = paymentStatus.step !== 'idle' && paymentStatus.planName === plan.name;

    if (isCurrent) return "outline";
    if (isProcessing) return "secondary";
    if (plan.popular) return "default";
    return "secondary";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#171717]">
      <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-8 py-8 pb-16">
        {/* Header */}
        <div className="text-center space-y-4">
          {/* Headline - Always visible immediately */}
      <h1 className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
        <div>Choose Your Plan </div>
      
        <span>and <span className="text-primary">Unlock full</span>  potential</span>
      </h1>
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
      <span>Transform a simple 5-6 word title into a viral thumbnail - instantly, with just a </span> <span>few clicks. No Design skills, no templates, just results.</span>
      </p>
      <div className="hidden sm:block">
      <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
      Choose Your Plan <br /> andUnlock <span className="text-primary"> full potential</span>
      </h1>
      
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
      Transform a simple 5-6 word title into a viral thumbnail - instantly, with just a few clicks. No Design skills, no templates, just results.
      </p>
      </div>

          {/* Payment Progress Indicator */}
          {paymentStatus.step !== 'idle' && (
            <div className="animate-element animate-delay-400 max-w-md mx-auto">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <div className="flex items-center gap-3">
                  {paymentStatus.step === 'creating' && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {paymentStatus.step === 'redirecting' && (
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  )}
                  {paymentStatus.step === 'processing' && (
                    <Loader2 className="h-5 w-5 animate-spin text-green-500" />
                  )}
                  {paymentStatus.step === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {paymentStatus.step === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {paymentStatus.planName} Plan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paymentStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="animate-element animate-delay-400 flex items-center justify-center gap-4">
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-primary' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch
            checked={billingCycle === 'yearly'}
            onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
            className="data-[state=checked]:bg-primary"
          />
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-primary' : 'text-muted-foreground'}`}>
              Yearly
            </span>
            <Badge variant="secondary" className="text-xs">
              Save 30%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="animate-element animate-delay-500 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto pb-32 md:pb-20">
          {PLANS[billingCycle].map((plan, index) => (
            <Card 
              key={plan.productId} 
              className={`animate-element animate-delay-${600 + (index * 100)} relative flex flex-col h-full transition-all duration-300 hover:shadow-lg ${
                plan.popular 
                  ? 'border-primary shadow-lg z-10 ring-2 ring-primary/20' 
                  : isCurrentPlan(plan.name)
                  ? 'border-green-500 shadow-md'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              )}
              {isCurrentPlan(plan.name) && (
                <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1">
                  Current Plan
                </Badge>
              )}
              
              <div className="p-6 flex flex-col h-full">
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period || '/month'}</span>
                  </div>
                  {plan.savings && (
                    <Badge variant="secondary" className="text-xs">
                      {plan.savings}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">{plan.credits}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button 
                  className={`w-full mt-auto transition-all duration-300 ${
                    plan.popular 
                      ? 'bg-primary hover:bg-primary/90' 
                      : isCurrentPlan(plan.name)
                      ? 'bg-green-500 hover:bg-green-600'
                      : paymentStatus.step !== 'idle' && paymentStatus.planName === plan.name
                      ? 'bg-primary/10 text-primary'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                  size="lg"
                  variant={getPaymentButtonVariant(plan)}
                  disabled={
                    isCurrentPlan(plan.name) || 
                    loading || 
                    !isPaymentConfigured() ||
                    (paymentStatus.step !== 'idle' && paymentStatus.planName !== plan.name)
                  }
                  onClick={() => handleSubscribe(plan)}
                >
                  {getPaymentButtonContent(plan)}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Features Comparison */}
        <div className="animate-element animate-delay-700 max-w-4xl mx-auto mt-12 pb-32 md:pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose Yoklick?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Generate viral thumbnails in seconds, not hours. No design skills required.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <Download className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">HD Quality</h3>
              <p className="text-sm text-muted-foreground">
                All thumbnails are generated in 1280x720 HD quality, perfect for YouTube.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">24/7 Support</h3>
              <p className="text-sm text-muted-foreground">
                Get help whenever you need it. Our team is here to support your success.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="animate-element animate-delay-900 max-w-4xl mx-auto mt-12 pb-32 md:pb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">What are credits?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are used to generate thumbnails. Each generation creates 4 variations and costs 4 credits.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. Your credits will remain available until used.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">What image quality do I get?</h3>
              <p className="text-sm text-muted-foreground">
                All plans generate high-quality 1280x720 thumbnails optimized for YouTube and social media.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Do unused credits roll over?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are valid for the duration of your subscription period and do not roll over.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
