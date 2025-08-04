import "@/app/globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthSync from "./components/AuthSync";
import { CreditsProvider } from "@/app/context/CreditsContext";
import { PaymentProvider } from "@/app/context/PaymentContext";
import { GenerationProvider } from "@/app/context/GenerationContext";
import GlobalLoader from "./components/GlobalLoader";
import Footer from "./components/Footer";

export const metadata = {
  title: "yoklick | AI Thumbnail Generator - Create Viral YouTube Thumbnails",
  description: "Transform your YouTube titles into viral thumbnails with yoklick's AI-powered generator. Create stunning, high-conversion thumbnails in seconds. No design skills required.",
  keywords: "AI thumbnail generator, YouTube thumbnails, viral thumbnails, thumbnail maker, YouTube marketing, content creation, AI design",
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
        url: '/yoklick.png',
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
    images: ['/yoklick.png'],
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <CreditsProvider>
          <PaymentProvider>
            <GenerationProvider>
                <ThemeProvider>
                 
                  <Toaster />
                  <AuthSync />
                  {children}
                  <Footer />
                </ThemeProvider>
            </GenerationProvider>
          </PaymentProvider>
        </CreditsProvider>
      </body>
    </html>
  );
}
