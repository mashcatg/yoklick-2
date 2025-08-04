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
import { bulkDownloadImages } from "@/app/lib/bulkDownload";
import { getUserWithFallback } from "@/app/lib/userCache";
import { RefreshCw } from "lucide-react";

// Simple shuffle function for client-side randomization if needed (not used with database view)
const simpleShuffle = (thumbnails: any[]) => {
  if (!thumbnails || thumbnails.length <= 1) return thumbnails;
  
  const shuffled = [...thumbnails];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function ExplorePage() {
  const [user, setUser] = useState<any>(null);
  const [publicThumbs, setPublicThumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false); // Track if user is loaded
  const [forceSkeleton, setForceSkeleton] = useState(false); // Force skeleton display
  const { refreshCredits } = useCredits();
  const { isGenerating, stopGeneration, startGeneration } = useGeneration();
  
  // PromptBox2 state for explore page
  const [prompt, setPrompt] = useState("");
  const [privacy, setPrivacy] = useState(true); // true = public
  const [textPosition, setTextPosition] = useState("auto");

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

        // Fetch thumbnails from the randomized database view
        const { data: pub } = await supabase
          .from("public_thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .eq("is_public", true)
          .eq("is_hidden", false)
          .limit(12); // Get 12 thumbnails from the randomized view
        
        if (pub) {
          setPublicThumbs(pub);
        }
        
        setLoading(false);
      } catch (error) {
        // Silent error handling for production
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []); // Only run once on mount

  // Simple function to fetch thumbnails from the randomized database view
  const fetchThumbnails = async (pageNum: number, reset: boolean = false) => {
    if (reset) {
      setPublicThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
      setPage(0);
      setHasMore(true);
    }

    setLoadingMore(true);
    
    try {
      // Small delay to show skeleton loading
      if (reset) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Use the randomized database view
      let query = supabase
        .from("public_thumbnails")
        .select("id, image_url, prompt, created_at, user_id, group_id, is_hidden, is_public, is_featured, user:users_meta(id, name, avatar_url)")
        .eq("is_hidden", false)
        .eq("is_public", true);

      // Apply search filter if search term exists
      if (search.trim()) {
        // Search in both prompt and user name
        query = query.or(`prompt.ilike.%${search.trim()}%,user.name.ilike.%${search.trim()}%`);
      }

      // Simple pagination with the randomized view
      const { data, error } = await query
        .range(pageNum * 12, (pageNum + 1) * 12 - 1);

      if (error) {
        // Silent error handling for production
      }

      if (data && data.length > 0) {
        if (reset || pageNum === 0) {
          setPublicThumbs(data);
        } else {
          // Prevent duplicates by filtering out existing thumbnails
          const existingIds = new Set(publicThumbs.map(thumb => thumb.id));
          const newThumbnails = data.filter(thumb => !existingIds.has(thumb.id));
          setPublicThumbs(prev => [...prev, ...newThumbnails]);
        }

        setHasMore(data.length === 12);
        setPage(pageNum + 1);
      } else {
        // No data returned
        if (reset || pageNum === 0) {
          setPublicThumbs([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      // Silent error handling for production
      if (publicThumbs.length === 0 || reset) {
        toast.error("Failed to load thumbnails. Please try again.");
      }
    } finally {
      setLoadingMore(false);
    }
  };

  // Load more thumbnails
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    await fetchThumbnails(page, false);
  }, [loadingMore, hasMore, page]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500) {
      loadMore();
    }
  }, [loadMore]);

  // Add scroll listener
  useEffect(() => {
    let ticking = false;
    
    const throttledScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [handleScroll]);

  // Search functionality
  useEffect(() => {
    const handleSearch = async () => {
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setPublicThumbs([]);
      
      await fetchThumbnails(0, true);
      setLoading(false);
    };

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleGenerate = async () => {
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setPublicThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await refreshCredits();
      toast.success("Thumbnails generated successfully!");
      
      setPage(0);
      setHasMore(true);
      await fetchThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setPublicThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration();
    }
  };

  const handleRegenerate = async (prompt: string, is_public: boolean, text_position: string) => {
    // IMMEDIATELY set skeleton state - this triggers instantly
    setForceSkeleton(true);
    setPublicThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await refreshCredits();
      toast.success("Thumbnails regenerated successfully!");
      
      setPage(0);
      setHasMore(true);
      await fetchThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setPublicThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration();
    }
  };

  const handleBulkDownload = async () => {
    const selectedThumbs = publicThumbs.filter(t => selectedIds.includes(t.id));
    if (selectedThumbs.length === 0) {
      toast.error("Please select thumbnails to download");
      return;
    }

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
      // Silent error handling for production
      toast.error("Failed to download thumbnails. Please try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkShare = () => {
    const selectedThumbs = publicThumbs.filter(t => selectedIds.includes(t.id));
    const urls = selectedThumbs.map(t => `${window.location.origin}/view/${t.id}`);
    const shareText = urls.join("\n\n");
    if (navigator.share) {
      navigator.share({
        title: "Check out these thumbnails!",
        text: shareText,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share URLs copied to clipboard!");
    }
  };

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
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Handle voice input here
      toast.success(`Voice input: ${transcript}`);
    };
    recognition.onerror = () => {
      toast.error("Could not recognize speech.");
    };
    recognition.start();
  };

  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-2 md:gap-8 py-8">
      <h1 className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
        <div>Explore </div>
        <span>Creative <span className="text-primary">Thumbnails</span></span>
      </h1>
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
        <span>Discover amazing thumbnails from creators around the world. Get inspired and create your own.</span>
      </p>
      <div className="hidden sm:block">
        <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
          Explore <br /> Creative <span className="text-primary">Thumbnails</span>
        </h1>
        <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
          Discover amazing thumbnails from creators around the world. Get inspired and create your own.
        </p>
      </div>
      
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

      <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
        <div><h2 className="text-xl md:text-2xl font-semibold">Explore Thumbnails</h2></div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search thumbnails..."
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchThumbnails(0, true)}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? "Loading..." : "Randomize"}
          </Button>

        </div>
      </div>
      
      {loading ? (
        <ThumbnailsGrid
          thumbnails={[null, null, null, null, null, null, null, null, null, null, null, null]}
          loading={true}
          onRegenerate={handleRegenerate}
          gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          quantity={12}
          isRegenerating={false}
        />
      ) : publicThumbs.length === 0 && search.trim() ? (
        <NoResultsFound 
          searchTerm={search.trim()} 
          onClearSearch={() => setSearch("")}
        />
      ) : (
        <>
          <ThumbnailsGrid
            thumbnails={publicThumbs}
            loading={false}
            onRegenerate={handleRegenerate}
            gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            quantity={publicThumbs.length}
            isRegenerating={false}
            showCheckbox={true}
            key={`explore-grid-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
          />
          
          {/* Show skeleton loading for infinite scroll instead of text */}
          {loadingMore && (
            <ThumbnailsGrid
              thumbnails={[null, null, null, null, null, null, null, null, null, null, null, null]}
              loading={true}
              onRegenerate={handleRegenerate}
              gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={12}
              isRegenerating={false}
            />
          )}
        </>
      )}
      
      {!hasMore && publicThumbs.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">You've reached the end of all thumbnails!</p>
        </div>
      )}

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