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
import { reactionCache } from "@/app/lib/reactionCache";
import { getUserWithFallback } from "@/app/lib/userCache";

export default function MyLikedPage() {
  const [user, setUser] = useState<any>(null);
  const [likedThumbs, setLikedThumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [hasConfirmedNoData, setHasConfirmedNoData] = useState(false); // Track if we've confirmed no data from DB
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false); // Track if user is loaded
  const { refreshCredits } = useCredits();
  const { isGenerating, stopGeneration } = useGeneration();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [privacy, setPrivacy] = useState(true);
  const [textPosition, setTextPosition] = useState("auto");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // ALWAYS show skeleton loading first for better UX
        setLoading(true);
        setLikedThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
        setHasConfirmedNoData(false);
        
        // Fetch user using smart cache
        const userData = await getUserWithFallback();
        if (!userData) {
          router.push("/auth/signin");
          return;
        }
        
        setUser(userData);
        setUserLoaded(true); // Mark user as loaded

        if (userData?.id) {
          setPage(0);
          setHasMore(true);
          
          await fetchLikedThumbnails(0, true);
        }
      } catch (error) {
        toast.error("Failed to load some content");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [router]);

  const fetchLikedThumbnails = async (pageNum: number, reset: boolean = false) => {
    try {
      if (!user?.id) return;

      const pageSize = 12;
      const from = pageNum * pageSize;
      const to = from + pageSize - 1;

      // Use cached user reactions for faster loading
      const userReactions = await reactionCache.getUserReactions(user.id);
      
      if (!userReactions || userReactions.size === 0) {
        if (reset) {
          setLikedThumbs([]);
          setHasConfirmedNoData(true);
        }
        setHasMore(false);
        return;
      }

      const thumbnailIds = Array.from(userReactions);

      let query = supabase
        .from("thumbnails")
        .select("*, user:users_meta(id, name, avatar_url)")
        .in("id", thumbnailIds)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false }); // Order by newest first

      if (search.trim()) {
        query = query.ilike("prompt", `%${search.trim()}%`);
      }

      const { data, error } = await query.range(from, to);

      if (error) {
        throw error;
      }

      if (data) {
        if (reset) {
          // Show thumbnails in order (newest first) - no shuffling
          setLikedThumbs(data);
          setHasConfirmedNoData(false); // Confirm we have data
        } else {
          // Add new data to existing thumbnails (maintaining order)
          setLikedThumbs(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === pageSize);
      } else {
        // No data returned from DB - confirm this after first fetch
        if (reset) {
          setLikedThumbs([]);
          setHasConfirmedNoData(true);
        }
        setHasMore(false);
      }
    } catch (error) {
      toast.error("Failed to load liked thumbnails");
      // On error, also confirm no data
      if (reset) {
        setLikedThumbs([]);
        setHasConfirmedNoData(true);
      }
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !user?.id) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    
    await fetchLikedThumbnails(nextPage, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, user?.id]);

  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1000) {
      loadMore();
    }
  }, [loadMore]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!user?.id) return;
      
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setLikedThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
      setHasConfirmedNoData(false);
      
      await fetchLikedThumbnails(0, true);
      setLoading(false);
    };

    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, user?.id]);

  const handleGenerate = async () => {
    setLikedThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
    setLoading(true);
    
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
      setPrompt("");
      toast.success("Thumbnails generated successfully!");
      
      setPage(0);
      setHasMore(true);
      await fetchLikedThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setLikedThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration();
    }
  };

  const handleRegenerate = async (prompt: string, is_public: boolean, text_position: string) => {
    setLikedThumbs([null, null, null, null, null, null, null, null, null, null, null, null]);
    setLoading(true);
    
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
      await fetchLikedThumbnails(0, true);
    } catch (e: any) {
      toast.error(e.message);
      setLikedThumbs([]);
    } finally {
      setLoading(false);
      stopGeneration();
    }
  };

  const handleBulkDownload = async () => {
    const selectedThumbs = likedThumbs.filter(t => selectedIds.includes(t.id));
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
    const selectedThumbs = likedThumbs.filter(t => selectedIds.includes(t.id));
    const urls = selectedThumbs.map(t => `${window.location.origin}/view/${t.id}`);
    const shareText = urls.join("\n\n");
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
        <div>Your Loved </div>
        <span>Creative <span className="text-primary">Thumbnails</span></span>
      </h1>
      <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
        <span>Browse all the thumbnails you've liked. Your personal collection of creative inspiration.</span>
      </p>
      <div className="hidden sm:block">
        <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
          Your Loved <br /> Creative <span className="text-primary">Thumbnails</span>
        </h1>
        <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
          Browse all the thumbnails you've liked. Your personal collection of creative inspiration.
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
        />
      </div>

      <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
        <div><h2 className="text-xl md:text-2xl font-semibold">My Liked Thumbnails</h2></div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your liked thumbnails..."
            className="max-w-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(selectedIds.length > 0 ? [] : likedThumbs.map(t => t.id))}
            className="flex items-center gap-2"
          >
            {selectedIds.length > 0 ? "Cancel Selection" : "Select All"}
          </Button>
        </div>
      </div>
      
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
      ) : likedThumbs.length === 0 && search.trim() ? (
        <NoResultsFound 
          searchTerm={search.trim()} 
          onClearSearch={() => setSearch("")}
        />
      ) : likedThumbs.length === 0 && hasConfirmedNoData ? (
        <NoThumbnailsFound />
      ) : likedThumbs.length === 0 ? (
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
            thumbnails={likedThumbs}
            loading={false}
            onRegenerate={handleRegenerate}
            gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            quantity={likedThumbs.length}
            isRegenerating={false}
            showCheckbox={true}
            key={`liked-grid-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
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
      
      {!hasMore && likedThumbs.length > 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">You've reached the end of all your liked thumbnails!</p>
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