import "@/app/globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthSync from "./components/AuthSync";
import { CreditsProvider } from "@/app/context/CreditsContext";
import { PaymentProvider } from "@/app/context/PaymentContext";
import { GenerationProvider } from "@/app/context/GenerationContext";
import GlobalLoader from "./components/GlobalLoader";
import Footer from "./components/Footer";
import { SpeedInsights } from "@vercel/speed-insights/next"
export const metadata = {
  title: "yoklick | AI Thumbnail Generator - Create Viral YouTube Thumbnails",
  description: "Transform your YouTube titles into viral thumbnails with yoklick's AI-powered generator. Create stunning, high-conversion thumbnails in seconds. No design skills required.",
  keywords: "AI thumbnail generator, YouTube thumbnails, viral thumbnails, thumbnail maker, YouTube marketing, content creation, AI design, YouTube thumbnail maker, social media thumbnails",
  authors: [{ name: "Mashraf Aiman" }, { name: "Istiaque Zaman" }],
  creator: "yoklick",
  publisher: "yoklick",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://yoklick.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "yoklick | AI Thumbnail Generator",
    description: "Create viral YouTube thumbnails with AI. Transform simple titles into stunning thumbnails in seconds.",
    url: 'https://yoklick.com',
    siteName: 'yoklick',
    images: [
      {
        url: '/yoklick-banner-1.png',
        width: 1200,
        height: 630,
        alt: 'yoklick AI Thumbnail Generator',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "yoklick | AI Thumbnail Generator",
    description: "Create viral YouTube thumbnails with AI. Transform simple titles into stunning thumbnails in seconds.",
    images: ['/yoklick-banner-1.png'],
    creator: '@yoklick',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  icons: {
    icon: '/yoklick-favicon-2.png',
    shortcut: '/yoklick-favicon-2.png',
    apple: '/yoklick-favicon-2.png',
    other: [
      {
        rel: 'icon',
        url: '/yoklick-favicon-2.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        rel: 'icon',
        url: '/yoklick-favicon-2.png',
        sizes: '16x16',
        type: 'image/png',
      },
    ],
  },
  manifest: '/manifest.json',
  category: 'technology',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "yoklick - AI Thumbnail Generator",
    "description": "Create viral YouTube thumbnails with AI. Transform simple titles into stunning thumbnails in seconds.",
    "url": "https://yoklick.com",
    "applicationCategory": "DesignApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "author": {
      "@type": "Organization",
      "name": "yoklick",
      "url": "https://yoklick.com"
    },
    "creator": {
      "@type": "Person",
      "name": "Mashraf Aiman"
    },
    "publisher": {
      "@type": "Organization",
      "name": "yoklick",
      "logo": {
        "@type": "ImageObject",
        "url": "https://yoklick.com/yoklick-favicon-2.png"
      },
      "url": "https://yoklick.com",
      "sameAs": [
        "https://www.facebook.com/teamennovat/",
        "https://x.com/teamennovat",
        "https://www.instagram.com/teamennovat/",
        "https://www.linkedin.com/company/ennovat"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "hello@yoklick.com",
        "contactType": "customer service"
      }
    },
    "featureList": [
      "AI-powered thumbnail generation",
      "YouTube thumbnail optimization",
      "Viral thumbnail design",
      "No design skills required",
      "Instant generation"
    ],
    "screenshot": "https://yoklick.com/yoklick.png",
    "softwareVersion": "1.0.0"
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/yoklick-favicon-2.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/yoklick-favicon-2.png" />
        <link rel="apple-touch-icon" href="/yoklick-favicon-2.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://*.supabase.co" />
        <link rel="dns-prefetch" href="https://api.deepseek.com" />
        <link rel="dns-prefetch" href="https://api.studio.nebius.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning>
        <ErrorBoundary>
          <CreditsProvider>
            <PaymentProvider>
              <GenerationProvider>
                <ThemeProvider>
                  <Toaster />
                  <AuthSync />
                  {children}
                  <Footer />
                  <SpeedInsights />
                </ThemeProvider>
              </GenerationProvider>
            </PaymentProvider>
          </CreditsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
