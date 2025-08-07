"use client";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 animate-element animate-delay-100">About Yoklick</h1>
        
        <div className="space-y-6 animate-element animate-delay-200">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Yoklick is a creative design studio built to help digital creators stand out in a crowded online world. 
              We specialize in scroll-stopping visuals — from YouTube thumbnails and blog banners to Twitch overlays, 
              brand kits, and more.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Founded by a team of designers and marketers who understand the creator economy from the inside, 
              Yoklick was born with one mission: <span className="font-semibold text-primary">To make creators look as good as their content deserves.</span>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We don't just design — we craft strategies through visuals that boost click-through rates, 
              improve viewer retention, and build a recognizable brand identity across all platforms.
            </p>
            <div className="my-8">
              <img 
                src="/yoklick-banner-1.png" 
                alt="Yoklick Creative Design Studio - Professional design solutions for digital creators" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Whether you're a YouTuber, blogger, podcaster, Twitch streamer, or content creator on any platform, 
              Yoklick is here to elevate your presence with clean, bold, and conversion-optimized designs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Comprehensive design solutions tailored for the modern creator economy:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>YouTube Thumbnails - Get more views with designs that demand attention</li>
              <li>Blog & WordPress Banners - Professionally crafted banners to match your niche</li>
              <li>Twitch Panels & Stream Overlays - Visuals that enhance your stream's personality</li>
              <li>Branded Social Media Graphics - Stay consistent across Instagram, X, TikTok, and more</li>
              <li>Full Brand Identity Kits - Logos, fonts, colors, and templates tailored to your content</li>
              <li>AI Thumbnail Generator - Create viral YouTube thumbnails with cutting-edge AI technology</li>
            </ul>
            <div className="my-8">
              <img 
                src="/yoklick-banner-2.png" 
                alt="YouTube Thumbnail Design Services - Professional thumbnail creation for content creators" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Why Creators Trust Yoklick</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We've built our reputation on delivering results that matter:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4 mb-6">
              <li>Deep understanding of the creator economy and what drives engagement</li>
              <li>Proven results: Higher CTRs, better engagement, stronger branding</li>
              <li>Fast delivery with consistent quality and attention to detail</li>
              <li>Affordable plans and flexible subscription options for creators of all sizes</li>
              <li>Built by creators, for creators who understand your needs</li>
              <li>Cutting-edge AI technology for instant, professional-quality designs</li>
            </ul>
            <div className="my-8">
              <img 
                src="/yoklick-banner-3.png" 
                alt="Brand Identity Design Services - Complete branding solutions for content creators" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Vision</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              We envision a world where every online creator, no matter their size, has access to 
              top-tier design that fuels growth, strengthens trust, and makes their first impression unforgettable.
            </p>
            <div className="my-8">
              <img 
                src="/yoklick-banner-4.png" 
                alt="Social Media Graphics Design - Professional social media content creation services" 
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Our commitment is to democratize professional design, making it accessible to creators 
              at every stage of their journey. From emerging YouTubers to established influencers, 
              we provide the tools and expertise needed to create compelling visual content that drives results.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Work With Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you're serious about taking your content to the next level, we're here to help. 
              Let's build a brand your audience will remember.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Ready to transform your visual presence? Explore our pricing plans or reach out to discuss 
              your specific needs. Our team is ready to help you create designs that not only look great 
              but also drive real results for your content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Have questions about our services or ready to get started? Contact us at{" "}
              <a href="mailto:hello@yoklick.com" className="text-primary hover:underline">
                hello@yoklick.com
              </a>{" "}
              or explore our{" "}
              <a href="/pricing" className="text-primary hover:underline">
                pricing plans
              </a>{" "}
              to find the perfect solution for your creative needs.
            </p>
          </section>

          <section className="pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
} 