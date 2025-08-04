"use client";
import { useState, useEffect, useCallback } from "react";
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
import NoResultsFound from "@/app/components/NoResultsFound";
import NoThumbnailsFound from "@/app/components/NoThumbnailsFound";
import { bulkDownloadImages } from "@/app/lib/bulkDownload";
import { getUserWithFallback } from "@/app/lib/userCache";
import { Heart } from "lucide-react";

import React from "react";

export default function MyGenerationsPage() {
  const [user, setUser] = useState<any>(null);
  const [myThumbs, setMyThumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasConfirmedNoData, setHasConfirmedNoData] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false); // Track if user is loaded
  const [forceSkeleton, setForceSkeleton] = useState(false); // Force skeleton display
  const { refreshCredits } = useCredits();
  const { isGenerating, stopGeneration, startGeneration } = useGeneration();
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [privacy, setPrivacy] = useState(true); // true = public
  const [textPosition, setTextPosition] = useState("auto");
  const [isListening, setIsListening] = useState(false);

  // Fetch user session and initial thumbnails (only once on mount)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // ALWAYS show skeleton loading first for better UX
        setLoading(true);
        setMyThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
        setHasConfirmedNoData(false);
        
        // Fetch user session using smart cache
        const userData = await getUserWithFallback();
        if (!userData) {
          router.push("/auth/signin");
          return;
        }
        
        setUser(userData);
        setUserLoaded(true); // Mark user as loaded

        // Only fetch thumbnails if user is available
        if (userData?.id) {
          // Reset pagination
          setPage(0);
          setHasMore(true);
          
          // Fetch initial user thumbnails
          await fetchThumbnails(0, true);
        }
      } catch (error) {
        // Silent error handling for production
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [router]); // Only run once on mount

  // Function to fetch thumbnails with pagination
  const fetchThumbnails = async (pageNum: number, reset: boolean = false) => {
    try {
      if (!user?.id) {
        return;
      }

      const pageSize = 12;
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("thumbnails")
        .select("*, user:users_meta(id, name, avatar_url)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }) // Order by newest first
        .range(from, to);

      // Add search filter if search term exists
      if (search.trim()) {
        // Search in both prompt and user name
        query = query.or(`prompt.ilike.%${search.trim()}%,user.name.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        if (reset) {
          // Show thumbnails in order (newest first) - no shuffling
          setMyThumbs(data);
          // Confirm we have data from DB
          setHasConfirmedNoData(false);
        } else {
          // Add new data to existing thumbnails (maintaining order)
          setMyThumbs(prev => [...prev, ...data]);
        }
        
        // Check if we have more data
        setHasMore(data.length === pageSize);
      } else {
        // No data returned from DB - confirm this after first fetch
        if (reset) {
          setMyThumbs([]);
          setHasConfirmedNoData(true);
        }
        setHasMore(false);
      }
    } catch (error) {
      // Silent error handling for production
      if (reset) {
        setMyThumbs([]);
        setHasConfirmedNoData(true);
      }
    }
  };

  // Load more thumbnails
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !user?.id) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    await fetchThumbnails(nextPage, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, user?.id]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
      loadMore();
    }
  }, [loadMore]);

  // Add scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Separate effect for search functionality
  useEffect(() => {
    const handleSearch = async () => {
      if (!user?.id) return; // Don't search if user not loaded
      
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setMyThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
      setHasConfirmedNoData(false);
      
      await fetchThumbnails(0, true);
      setLoading(false);
    };

    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, user?.id]);

  // For PromptBox2 (generate)
  const handleGenerate = async () => {
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setMyThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
    setLoading(true);
    
    // Start global generation state
    startGeneration();
    
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
      
      await refreshCredits();
      setPrompt("");
      toast.success("Thumbnails generated successfully!");
      
      // Refresh the thumbnails list
      setPage(0);
      setHasMore(true);
      await fetchThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setMyThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration(); // Stop global generation state
    }
  };

  // For ThumbnailsGrid (regenerate)
  const handleRegenerate = async (prompt: string, is_public: boolean, text_position: string) => {
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setMyThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
    setLoading(true);
    
    // Start global generation state
    startGeneration();
    
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
      
      await refreshCredits();
      toast.success("Thumbnails regenerated successfully!");
      
      // Refresh the thumbnails list
      setPage(0);
      setHasMore(true);
      await fetchThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setMyThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration(); // Stop global generation state
    }
  };

  const handleBulkDownload = async () => {
    const selectedThumbs = myThumbs.filter(t => selectedIds.includes(t.id));
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
      toast.error("Failed to download thumbnails. Please try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkShare = () => {
    const selectedThumbs = myThumbs.filter(t => selectedIds.includes(t.id));
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
      <h1 className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
        <div>Your Fantastic Arts </div>
      
        <span>beyond our <span className="text-primary">Imagination</span></span>
      </h1>
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
      <span>Browse high-performing thumbnails created from simple titles. See what’s trending, get inspired, and spark ideas for your next viral hit.</span>
      </p>
      <div className="hidden sm:block">
      <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
      Your Fantastic Arts <br /> beyond our <span className="text-primary">Imagination</span>
      </h1>
      
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
      Browse high-performing thumbnails created from simple titles. See what’s trending, get inspired, and spark ideas for your next viral hit.
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
          disabled={isGenerating}
        />
      </div>

      {/* My Generations Section - Show skeleton loading first */}
      <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
        <div><h2 className="text-xl md:text-2xl font-semibold">My Generations</h2></div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your thumbnails..."
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(selectedIds.length > 0 ? [] : myThumbs.map(t => t.id))}
            className="flex items-center gap-2"
          >
            {selectedIds.length > 0 ? "Cancel Selection" : "Select All"}
          </Button>
          <Link href="/liked">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Liked
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Show loading skeleton first, then content */}
      {loading ? (
        <ThumbnailsGrid
          thumbnails={[null, null, null, null, null, null, null, null, null, null, null, null]}
          loading={true}
          onRegenerate={handleRegenerate}
          gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          quantity={12}
          isRegenerating={false}
        />
      ) : myThumbs.length === 0 && search.trim() ? (
        <NoResultsFound 
          searchTerm={search.trim()} 
          onClearSearch={() => setSearch("")}
        />
      ) : myThumbs.length === 0 && hasConfirmedNoData ? (
        <NoThumbnailsFound />
      ) : myThumbs.length === 0 ? (
        <ThumbnailsGrid
          thumbnails={[null, null, null, null, null, null, null, null, null, null, null, null]}
          loading={true}
          onRegenerate={handleRegenerate}
          gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          quantity={12}
          isRegenerating={false}
        />
      ) : (
        <>
          <ThumbnailsGrid
            thumbnails={myThumbs}
            loading={false}
            onRegenerate={handleRegenerate}
            gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            quantity={myThumbs.length}
            isRegenerating={false}
            showCheckbox={true}
            key={`generations-grid-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
          />
          
          {/* Show skeleton loading for infinite scroll instead of text */}
          {loadingMore && (
            <ThumbnailsGrid
              thumbnails={[null, null, null, null, null, null, null, null, null, null, null, null]}
              loading={true}
              onRegenerate={handleRegenerate}
              gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={12}
              isRegenerating={false}
            />
          )}
        </>
      )}
      
      {/* End of content message */}
      {!hasMore && myThumbs.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">You've reached the end of all your thumbnails!</p>
        </div>
      )}

      {/* Bulk Action Bar - Always visible when needed */}
      {selectedIds.length > 0 && (
        <div className="
          fixed z-50
          left-0 right-0 bottom-0
          w-full md:w-fit
          bg-white/95 dark:bg-black/95 backdrop-blur-md
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