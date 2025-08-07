import Link from "next/link";
import { CheckCircle, Users, Palette, Target, Zap, Shield, Star, TrendingUp } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              About <span className="text-blue-600 dark:text-blue-400">Yoklick</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
              A creative design studio built to help digital creators stand out in a crowded online world. 
              We specialize in scroll-stopping visuals that boost engagement and build brand identity.
            </p>
          </div>
          
          {/* Hero Image Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/yoklick-banner-1.png" 
                alt="Yoklick Creative Design" 
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="relative overflow-hidden rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/yoklick-banner-2.png" 
                alt="YouTube Thumbnail Design" 
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="relative overflow-hidden rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/yoklick-banner-3.png" 
                alt="Brand Identity Design" 
                className="w-full h-48 object-cover"
              />
            </div>
            <div className="relative overflow-hidden rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <img 
                src="/yoklick-banner-4.png" 
                alt="Social Media Graphics" 
                className="w-full h-48 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <Target className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Our Mission
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              Founded by a team of designers and marketers who understand the creator economy from the inside, 
              Yoklick was born with one mission: <span className="font-semibold text-blue-600 dark:text-blue-400">
              To make creators look as good as their content deserves.</span>
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              We don't just design — we craft strategies through visuals that boost click-through rates, 
              improve viewer retention, and build a recognizable brand identity across all platforms.
            </p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Palette className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Comprehensive design solutions tailored for the modern creator economy
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* YouTube Thumbnails */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                YouTube Thumbnails
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get more views with designs that demand attention and drive higher click-through rates.
              </p>
            </div>

            {/* Blog Banners */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center mb-6">
                <Palette className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Blog & WordPress Banners
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Professionally crafted banners to match your niche and voice perfectly.
              </p>
            </div>

            {/* Twitch Overlays */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Twitch Panels & Stream Overlays
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Visuals that enhance your stream's personality and viewer experience.
              </p>
            </div>

            {/* Social Media Graphics */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Branded Social Media Graphics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Stay consistent and aesthetic across Instagram, X, TikTok, and more.
              </p>
            </div>

            {/* Brand Identity */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Full Brand Identity Kits
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Logos, fonts, colors, and templates — all tailored to your content.
              </p>
            </div>

            {/* AI Thumbnail Generator */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-xl flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                AI Thumbnail Generator
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Create viral YouTube thumbnails with AI. Transform simple titles into stunning designs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Trust Us Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Why Creators Trust Yoklick
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Deep Understanding
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Deep understanding of the creator economy and what drives engagement.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Proven Results
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Higher CTRs, better engagement, stronger branding across platforms.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Fast Delivery
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Quick turnaround times with consistent quality and attention to detail.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Affordable Plans
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Flexible pricing and subscription options for creators of all sizes.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Creator-Focused
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Built by creators, for creators who understand your needs.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  AI-Powered Innovation
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Cutting-edge AI technology for instant, professional-quality designs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <Target className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Our Vision
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              We envision a world where every online creator, no matter their size, has access to 
              top-tier design that fuels growth, strengthens trust, and makes their first impression unforgettable.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              Whether you're a YouTuber, blogger, podcaster, Twitch streamer, or content creator on any platform, 
              Yoklick is here to elevate your presence with clean, bold, and conversion-optimized designs.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Work With Us
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            If you're serious about taking your content to the next level, we're here to help. 
            Let's build a brand your audience will remember.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/pricing" 
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-colors duration-300 inline-flex items-center justify-center"
            >
              View Pricing
            </Link>
            <a 
              href="mailto:hello@yoklick.com" 
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-colors duration-300 inline-flex items-center justify-center"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
} 