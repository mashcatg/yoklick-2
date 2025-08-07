"use client";

import Link from "next/link";

export default function SitemapPage() {
  const pages = [
    {
      title: "Main Pages",
      links: [
        { href: "/", label: "Home", description: "AI Thumbnail Generator" },
        { href: "/explore", label: "Explore", description: "Discover public thumbnails" },
        { href: "/generations", label: "My Generations", description: "Your generated thumbnails" },
        { href: "/liked", label: "Liked Thumbnails", description: "Your favorite thumbnails" },
        { href: "/profile", label: "Profile", description: "User profile and settings" },
      ]
    },
    {
      title: "Account & Billing",
      links: [
        { href: "/auth/signin", label: "Sign In", description: "Login to your account" },
        { href: "/auth/signup", label: "Sign Up", description: "Create new account" },
        { href: "/pricing", label: "Pricing", description: "Subscription plans" },
        { href: "/subscription", label: "Subscription", description: "Manage your subscription" },
        { href: "/checkout", label: "Checkout", description: "Complete your purchase" },
      ]
    },
    {
      title: "Account Management",
      links: [
        { href: "/edit-profile", label: "Edit Profile", description: "Update your profile information" },
        { href: "/change-password", label: "Change Password", description: "Update your password" },
      ]
    },
    {
      title: "Content & Discovery",
      links: [
        { href: "/thumbnails", label: "Public Thumbnails", description: "Browse all public thumbnails" },
        { href: "/view", label: "View Thumbnail", description: "Detailed thumbnail view" },
      ]
    },
    {
      title: "Legal",
      links: [
        { href: "/about", label: "About Us", description: "Learn about Yoklick" },
        { href: "/privacy", label: "Privacy Policy", description: "How we handle your data" },
        { href: "/terms", label: "Terms & Conditions", description: "Terms of service" },
      ]
    },
    {
      title: "Support",
      links: [
        { href: "mailto:hello@yoklick.com", label: "Contact Support", description: "Get help from our team" },
        { href: "/debug", label: "Debug Tools", description: "Technical debugging (Admin)" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#171717]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 animate-element animate-delay-100">Sitemap</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-element animate-delay-200">
            {pages.map((section, sectionIndex) => (
              <div key={section.title} className={`animate-element animate-delay-${300 + (sectionIndex * 100)}`}>
                <h2 className="text-xl font-semibold mb-4 text-primary">{section.title}</h2>
                <div className="space-y-3">
                  {section.links.map((link, linkIndex) => (
                    <div key={link.href} className={`animate-element animate-delay-${400 + (sectionIndex * 100) + (linkIndex * 50)}`}>
                      <Link 
                        href={link.href}
                        className="block p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                      >
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {link.label}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {link.description}
                        </p>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t animate-element animate-delay-600">
            <h2 className="text-2xl font-semibold mb-6">Quick Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link 
                href="/"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group animate-element animate-delay-700"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary font-semibold">🏠</span>
                </div>
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors">Home</h3>
                  <p className="text-sm text-muted-foreground">Generate thumbnails</p>
                </div>
              </Link>

              <Link 
                href="/pricing"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group animate-element animate-delay-750"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary font-semibold">💳</span>
                </div>
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors">Pricing</h3>
                  <p className="text-sm text-muted-foreground">View plans</p>
                </div>
              </Link>

              <Link 
                href="/explore"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group animate-element animate-delay-800"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary font-semibold">🔍</span>
                </div>
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors">Explore</h3>
                  <p className="text-sm text-muted-foreground">Discover content</p>
                </div>
              </Link>

              <Link 
                href="mailto:hello@yoklick.com"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group animate-element animate-delay-850"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-primary font-semibold">📧</span>
                </div>
                <div>
                  <h3 className="font-medium group-hover:text-primary transition-colors">Support</h3>
                  <p className="text-sm text-muted-foreground">Get help</p>
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t animate-element animate-delay-900">
            <p className="text-sm text-muted-foreground text-center">
              Need help? Contact us at{" "}
              <a href="mailto:hello@yoklick.com" className="text-primary hover:underline">
                hello@yoklick.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 