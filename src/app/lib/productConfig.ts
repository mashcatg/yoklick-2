/**
 * Product Configuration
 * Handles dynamic product IDs and plan mapping for Dodo Payments
 */

export interface ProductConfig {
  productId: string;
  planType: string;
  credits: number;
  price: number;
  billingCycle: 'monthly' | 'yearly';
}

export interface PlanDetails {
  name: string;
  credits: number;
  price: number;
  color: string;
  features: string[];
}

// Environment-specific product mappings
const PRODUCT_MAPPINGS = {
  development: {
    starter: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_STARTER_MONTHLY_PRODUCT_ID || "pdt_PoCX9Im2AUmxotnYx9ydm",
        credits: 40,
        price: 9.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_STARTER_YEARLY_PRODUCT_ID || "pdt_RJ7OspzeWRD3XV0bqQJSn",
        credits: 40,
        price: 83.00
      }
    },
    creator: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_CREATOR_MONTHLY_PRODUCT_ID || "pdt_nzFFbBbSBVopc9gvAwGic",
        credits: 100,
        price: 18.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_CREATOR_YEARLY_PRODUCT_ID || "pdt_0MtQNcWe0trsg2IWtMLtx",
        credits: 100,
        price: 158.00
      }
    },
    pro: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_PRO_MONTHLY_PRODUCT_ID || "pdt_DNbzGIiBdpqiKlrWLOj6q",
        credits: 300,
        price: 38.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_PRO_YEARLY_PRODUCT_ID || "pdt_xchUmeCCUGlTCXmg7IkAP",
        credits: 300,
        price: 326.00
      }
    }
  },
  production: {
    starter: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_STARTER_MONTHLY_PRODUCT_ID || "pdt_aCeAOINH8bdnRRB6ntc3k",
        credits: 40,
        price: 9.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_STARTER_YEARLY_PRODUCT_ID || "pdt_N2AKdLOPAKRkx3fpcd0nY",
        credits: 40,
        price: 83.00
      }
    },
    creator: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_CREATOR_MONTHLY_PRODUCT_ID || "pdt_32QMss9DmmjfMVfYHpXCT",
        credits: 100,
        price: 18.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_CREATOR_YEARLY_PRODUCT_ID || "pdt_tvu9CXx72UJF1T3BQHSKg",
        credits: 100,
        price: 158.00
      }
    },
    pro: {
      monthly: {
        productId: process.env.NEXT_PUBLIC_DODO_PRO_MONTHLY_PRODUCT_ID || "pdt_h1pC9mPKvWleL3BH8hDBU",
        credits: 300,
        price: 38.89
      },
      yearly: {
        productId: process.env.NEXT_PUBLIC_DODO_PRO_YEARLY_PRODUCT_ID || "pdt_aO29vTbobbKXOw22R6IiQ",
        credits: 300,
        price: 326.00
      }
    }
  }
};

export function getProductConfig(planType: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): ProductConfig {
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const mappings = PRODUCT_MAPPINGS[environment];
  
  if (!mappings[planType] || !mappings[planType][billingCycle]) {
    throw new Error(`Product configuration not found for plan: ${planType}, cycle: ${billingCycle}`);
  }
  
  const config = mappings[planType][billingCycle];
  
  return {
    productId: config.productId,
    planType,
    credits: config.credits,
    price: config.price,
    billingCycle
  };
}

export function getPlanDetails(planType: string): PlanDetails {
  const plans = {
    starter: {
      name: 'Starter Plan',
      credits: 40,
      price: 9.89,
      color: 'text-yellow-600',
      features: [
        "40 AI-generated thumbnails",
        "Basic text positioning",
        "Standard generation quality",
        "Email support",
        "Download in HD"
      ]
    },
    creator: {
      name: 'Creator Plan',
      credits: 100,
      price: 18.89,
      color: 'text-purple-600',
      features: [
        "100 AI-generated thumbnails",
        "Advanced text positioning",
        "Premium generation quality",
        "Priority email support",
        "Download in HD",
        "Bulk download feature"
      ]
    },
    pro: {
      name: 'Pro Plan',
      credits: 300,
      price: 38.89,
      color: 'text-blue-600',
      features: [
        "300 AI-generated thumbnails",
        "All text positioning options",
        "Ultra-premium generation quality",
        "24/7 priority support",
        "Download in HD",
        "Bulk download & share",
        "Custom branding options"
      ]
    }
  };
  
  return plans[planType] || {
    name: 'Unknown Plan',
    credits: 0,
    price: 0,
    color: 'text-gray-600',
    features: []
  };
}

export function getPlanTypeFromProductId(productId: string): string {
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const mappings = PRODUCT_MAPPINGS[environment];
  
  // Search through all plans to find matching product ID
  for (const [planType, cycles] of Object.entries(mappings)) {
    for (const [cycle, config] of Object.entries(cycles)) {
      if (config.productId === productId) {
        return planType;
      }
    }
  }
  
  // Fallback mapping for unknown product IDs
  const fallbackMapping = {
    development: {
      'pdt_PoCX9Im2AUmxotnYx9ydm': 'starter',
      'pdt_RJ7OspzeWRD3XV0bqQJSn': 'starter',
      'pdt_nzFFbBbSBVopc9gvAwGic': 'creator',
      'pdt_0MtQNcWe0trsg2IWtMLtx': 'creator',
      'pdt_DNbzGIiBdpqiKlrWLOj6q': 'pro',
      'pdt_xchUmeCCUGlTCXmg7IkAP': 'pro',
    },
    production: {
      'pdt_aCeAOINH8bdnRRB6ntc3k': 'starter',
      'pdt_N2AKdLOPAKRkx3fpcd0nY': 'starter',
      'pdt_32QMss9DmmjfMVfYHpXCT': 'creator',
      'pdt_tvu9CXx72UJF1T3BQHSKg': 'creator',
      'pdt_h1pC9mPKvWleL3BH8hDBU': 'pro',
      'pdt_aO29vTbobbKXOw22R6IiQ': 'pro',
    }
  };
  
  return fallbackMapping[environment][productId] || 'unknown';
}

export function getAllProducts(): ProductConfig[] {
  const environment = process.env.NODE_ENV === 'development' ? 'development' : 'production';
  const mappings = PRODUCT_MAPPINGS[environment];
  const products: ProductConfig[] = [];
  
  for (const [planType, cycles] of Object.entries(mappings)) {
    for (const [billingCycle, config] of Object.entries(cycles)) {
      products.push({
        productId: config.productId,
        planType,
        credits: config.credits,
        price: config.price,
        billingCycle: billingCycle as 'monthly' | 'yearly'
      });
    }
  }
  
  return products;
} 