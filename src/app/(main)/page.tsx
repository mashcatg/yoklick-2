"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCredits } from "@/app/context/CreditsContext";
import { useGeneration } from "@/app/context/GenerationContext";
import PromptSection from "@/app/components/PromptSection";
import ThumbnailsGrid from "@/app/components/ThumbnailsGrid";
import { bulkDownloadImages } from "@/app/lib/bulkDownload";
import { getUserWithFallback } from "@/app/lib/userCache";

import React from "react";
import NoThumbnailsFound from "../components/NoThumbnailsFound";

// EXTREME PERFECT SHUFFLE - SEPARATES SAME GENERATION THUMBNAILS
const extremePerfectShuffle = (thumbnails: any[]) => {
  if (!thumbnails || thumbnails.length <= 1) return thumbnails;
  
  // Create a copy to avoid mutating original
  const shuffled = [...thumbnails];
  
  // Step 1: Group thumbnails by group_id to identify same generations
  const groupMap = new Map<string, any[]>();
  const noGroupThumbnails: any[] = [];
  
  shuffled.forEach(thumb => {
    if (thumb.group_id) {
      if (!groupMap.has(thumb.group_id)) {
        groupMap.set(thumb.group_id, []);
      }
      groupMap.get(thumb.group_id)!.push(thumb);
    } else {
      noGroupThumbnails.push(thumb);
    }
  });
  
  // Step 2: Create groups array with group thumbnails and individual thumbnails
  const groups: any[][] = [];
  
  // Add each group as a separate array
  groupMap.forEach(groupThumbs => {
    if (groupThumbs.length > 1) {
      groups.push(groupThumbs);
    } else {
      // Single thumbnails from groups go to noGroupThumbnails
      noGroupThumbnails.push(...groupThumbs);
    }
  });
  
  // Add individual thumbnails as single-item groups
  noGroupThumbnails.forEach(thumb => {
    groups.push([thumb]);
  });
  
  // Step 3: Shuffle groups themselves
  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }
  
  // Step 4: Shuffle within each group
  groups.forEach(group => {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
  });
  
  // Step 5: Interleave groups to maximize separation
  const result: any[] = [];
  const maxLength = Math.max(...groups.map(g => g.length));
  
  for (let i = 0; i < maxLength; i++) {
    groups.forEach(group => {
      if (i < group.length) {
        result.push(group[i]);
      }
    });
  }
  
  // Step 6: Apply additional random swaps to break any remaining patterns
  for (let i = 0; i < result.length * 2; i++) {
    const idx1 = Math.floor(Math.random() * result.length);
    const idx2 = Math.floor(Math.random() * result.length);
    if (idx1 !== idx2) {
      [result[idx1], result[idx2]] = [result[idx2], result[idx1]];
    }
  }
  
  return result;
};

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [myThumbs, setMyThumbs] = useState<any[]>([]);
  const [trendingThumbs, setTrendingThumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [myThumbsLoading, setMyThumbsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false); // Track if user is loaded
  const [localGenerating, setLocalGenerating] = useState(false); // Local generation state
  const [forceSkeleton, setForceSkeleton] = useState(false); // Force skeleton display
  const { refreshCredits } = useCredits();
  const { isGenerating, stopGeneration, startGeneration } = useGeneration();
  // PromptBox2 state
  const [prompt, setPrompt] = useState("");
  const [privacy, setPrivacy] = useState(true); // true = public
  const [textPosition, setTextPosition] = useState("auto");
  const [isListening, setIsListening] = useState(false);

  // Debug isGenerating state changes
  useEffect(() => {
    console.log('🔄 isGenerating state changed:', isGenerating);
  }, [isGenerating]);

  const fetchMyThumbs = async (userId: string) => {
    setMyThumbsLoading(true);
    const { data } = await supabase
      .from("thumbnails")
      .select("*, user:users_meta(id, name, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4);
    setMyThumbs(data || []);
    setMyThumbsLoading(false);
    await refreshCredits();
  };

  // Fetch user session and thumbnails (only once on mount)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Always show skeleton first
        setLoading(true);
        
        // Fetch user session using smart cache
        const userData = await getUserWithFallback();
        setUser(userData);
        setUserLoaded(true); // Mark user as loaded

        // Fetch user's thumbnails if logged in
        if (userData) {
          await fetchMyThumbs(userData.id);
        }

        // Fetch trending thumbnails once and shuffle
        const { data: pub } = await supabase
          .from("thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .eq("is_public", true)
          .eq("is_featured", true)
          .eq("is_hidden", false)
          .limit(1000);
        
        if (pub) {
          // Apply extreme perfect shuffle to ensure same generations are separated
          const shuffledData = extremePerfectShuffle(pub).slice(0, 9);
          setTrendingThumbs(shuffledData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error("Failed to load some content");
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []); // Only run once on mount

  // Separate effect for search functionality
  useEffect(() => {
    if (!search.trim()) return; // Don't fetch if search is empty
    
    const fetchSearchResults = async () => {
      setLoading(true);
      
      try {
        // Fetch search results
        const { data: searchResults } = await supabase
          .from("thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .eq("is_public", true)
          .eq("is_featured", true)
          .eq("is_hidden", false)
          .ilike("prompt", `%${search.trim()}%`)
          .limit(2000);
        
        if (searchResults) {
          // Apply extreme perfect shuffle to search results
          const shuffledData = extremePerfectShuffle(searchResults).slice(0, 9);
          setTrendingThumbs(shuffledData);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
        toast.error("Failed to load search results");
      } finally {
        setLoading(false);
      }
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchSearchResults();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  // Determine what to show (re-add these after useEffect)
  const showMy = user && myThumbs.length > 0;
  const showPublic = showMy ? trendingThumbs.slice(0, 12) : trendingThumbs.slice(0, 9);

  // For PromptBox2 (generate)
  const handleGenerate = async () => {
    console.log('🚀 Generate clicked, starting generation...');
    
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setLocalGenerating(true);
    setMyThumbs([null, null, null, null]);
    setMyThumbsLoading(true);
    
    // Start global generation state
    startGeneration(prompt);
    
    console.log('✅ Generate: Force skeleton set, myThumbs = [null, null, null, null]');
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          is_public: privacy,
          text_position: textPosition,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate");
      }
      
      // Keep skeleton visible for a moment to show generation progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData = await getUserWithFallback();
      if (userData) {
        await fetchMyThumbs(userData.id);
        await refreshCredits();
      }
      setPrompt("");
    } catch (e: any) {
      toast.error(e.message);
      setMyThumbs([]);
    } finally {
      setMyThumbsLoading(false);
      setLocalGenerating(false);
      setForceSkeleton(false);
      stopGeneration(); // Stop global generation state
    }
  };

  // For ThumbnailsGrid (regenerate)
  const handleRegenerate = async (prompt: string, is_public: boolean, text_position: string) => {
    console.log('🔄 Homepage regenerate called:', { prompt, is_public, text_position });
    
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setLocalGenerating(true);
    setMyThumbs([null, null, null, null]);
    setMyThumbsLoading(true);
    
    // Start global generation state
    startGeneration(prompt);
    
    console.log('✅ Regenerate: Force skeleton set, myThumbs = [null, null, null, null]');
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          is_public,
          text_position,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }
      
      // Keep skeleton visible for a moment to show generation progress
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData = await getUserWithFallback();
      if (userData) {
        await fetchMyThumbs(userData.id);
        await refreshCredits();
      }
    } catch (e: any) {
      toast.error(e.message);
      setMyThumbs([]);
    } finally {
      setMyThumbsLoading(false);
      setLocalGenerating(false);
      setForceSkeleton(false);
      stopGeneration(); // Stop global generation state
    }
  };

  const handleBulkDownload = async () => {
    const allThumbs = [...myThumbs, ...trendingThumbs];
    const selectedThumbs = allThumbs.filter(t => selectedIds.includes(t.id));
    if (selectedThumbs.length === 0) return;

    try {
      setIsBulkDownloading(true);
      const downloadedCount = await bulkDownloadImages(selectedThumbs);
      
      if (downloadedCount > 0) {
        toast.success(`Downloaded ${downloadedCount} thumbnail${downloadedCount === 1 ? '' : 's'}!`);
        setSelectedIds([]);
      } else {
        toast.error("Failed to download any thumbnails. Please try downloading individually.");
      }
    } catch (error) {
      console.error('Bulk download error:', error);
      toast.error("Failed to download thumbnails. Please try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkShare = () => {
    const allThumbs = [...myThumbs, ...trendingThumbs];
    const selectedThumbs = allThumbs.filter(t => selectedIds.includes(t.id));
    const urls = selectedThumbs.map(t => `${window.location.origin}/view/${t.id}`);
    const shareText = urls.join("\n\n"); // double newline for extra gap
    if (navigator.share) {
      navigator.share({
        title: "Check out these thumbnails!",
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share URLs copied to clipboard!");
    }
  };

  // Speech-to-text handler
  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(prev => prev ? prev + ' ' + transcript : transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Could not recognize speech.");
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };



  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-2 md:gap-8 py-8">
      {/* Headline - Always visible immediately */}
      <h1 className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
        <div>Turn Your Title </div>
      
        <span>Into Stunning <span className="text-primary">Thumbnails</span></span>
      </h1>
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
      <span>Transform a simple 5-6 word title into a viral thumbnail - instantly, with just a </span> <span>few clicks. No Design skills, no templates, just results.</span>
      </p>
      <div className="hidden sm:block">
      <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
        Turn Your Title <br /> Into Stunning <span className="text-primary">Thumbnails</span>
      </h1>
      
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
      Transform a simple 5-6 word title into a viral thumbnail - instantly, with just a few clicks. No Design skills, no templates, just results.
      </p>
      </div>
      
      {/* Prompt Section - Always visible immediately */}
      <div className="animate-element animate-delay-300">
        <PromptSection
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          isLoading={isGenerating}
          textPosition={textPosition as any}
          onTextPositionChange={setTextPosition as any}
          isPublic={privacy}
          onIsPublicChange={setPrivacy}
          onVoiceClick={handleVoiceInput}
          disabled={isGenerating} // Disable during global generation
        />
      </div>

      {/* User's Recent Generations - Show perfect skeleton loading during generation */}
      {userLoaded && (
        <>
          <h2 className="text-xl md:text-2xl font-semibold mt-6 mb-2">
            Your Recent Generations
            {(forceSkeleton || localGenerating || isGenerating) && (
              <span className="ml-2 text-sm text-muted-foreground font-normal">
                (Generating...)
              </span>
            )}
          </h2>
          {(() => {
            const shouldShowSkeletons = forceSkeleton || localGenerating || isGenerating || myThumbsLoading || myThumbs.some(t => t === null);
            console.log('🎭 Skeleton Debug:', {
              forceSkeleton,
              localGenerating,
              isGenerating,
              myThumbsLoading,
              hasNullThumbs: myThumbs.some(t => t === null),
              shouldShowSkeletons,
              myThumbsLength: myThumbs.length,
              myThumbs: myThumbs
            });
            return shouldShowSkeletons;
          })() ? (
            <ThumbnailsGrid
              thumbnails={[null, null, null, null]}
              loading={true}
              onRegenerate={handleRegenerate}
              gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-4 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={4}
              isRegenerating={false}
            />
          ) : myThumbsLoading || myThumbs.some(t => t === null) ? (
            <ThumbnailsGrid
              thumbnails={[null, null, null, null]}
              loading={true}
              onRegenerate={handleRegenerate}
              gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-4 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={4}
              isRegenerating={false}
            />
          ) : myThumbs.length === 0 ? (
            <NoThumbnailsFound />
          ) : (
            <ThumbnailsGrid
              thumbnails={myThumbs}
              loading={false}
              onRegenerate={handleRegenerate}
              gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-4 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={4}
              isRegenerating={false}
              showCheckbox={true}
              key={`home-my-thumbs-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
            />
          )}
        </>
      )}

      {/* Trending Thumbnails Section - Show skeleton loading first */}
      {userLoaded && (
        <>
          <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
            <div><h2 className="text-xl md:text-2xl font-semibold">Trending Thumbnails</h2></div>
            {showMy && (
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search public thumbnails..."
                className="max-w-xs"
              />
            )}
          </div>
          <ThumbnailsGrid
            thumbnails={loading ? [null, null, null, null, null, null, null, null, null] : showPublic}
            loading={loading}
            onRegenerate={handleRegenerate}
            gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            quantity={loading ? 9 : showPublic.length}
            isRegenerating={false}
            showCheckbox={true}
            key={`home-trending-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
          />
        </>
      )}
      
      {/* View More Button - Always visible immediately */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
        <Link href="/explore">
          <Button variant="secondary" className="rounded-full px-6 py-2 font-semibold hover:bg-primary/10 hover:text-primary">
            View More
          </Button>
        </Link>
      </div>

      {/* Bulk Action Bar - Always visible when needed */}
      {selectedIds.length > 0 && (
        <div className="
          fixed z-50 rounded-t-xl
          left-0 right-0 bottom-0
          w-full md:w-fit pb-[90px]
          bg-white dark:bg-[#303030]
          border-t border-border
          flex flex-col sm:flex-row items-center justify-center
          gap-2 sm:gap-4
          px-2 md:px-6 py-8 md:py-3 pb-[100px]
          sm:rounded-full sm:shadow-lg sm:w-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6
          transition-all
        ">
          <span className="font-semibold">{selectedIds.length} selected</span>
          <Button onClick={handleBulkDownload} disabled={isBulkDownloading}>
            {isBulkDownloading ? "Downloading..." : "Download"}
          </Button>
          <Button onClick={handleBulkShare}>Share</Button>
          <Button variant="ghost" onClick={() => setSelectedIds([])}>Cancel</Button>
        </div>
      )}
    </div>
  );
} 