"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Copy, Download, Share, RefreshCw, X, Heart } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ThumbnailCard from "@/app/components/ThumbnailCard";
import ThumbnailsGrid from "@/app/components/ThumbnailsGrid";
import { useCredits } from "@/app/context/CreditsContext";
import { cleanPrompt, generateSearchQueries } from "@/lib/promptUtils";
import Link from "next/link";
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate, ensureUserData } from "@/app/lib/userUtils";
import { bulkDownloadImages } from "@/app/lib/bulkDownload";
import { getUserWithFallback } from "@/app/lib/userCache";
import { userDataCache } from "@/app/lib/userDataCache";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at?: string;
  is_public?: boolean;
  text_position?: string;
  user_id?: string;
  group_id?: string;
  is_hidden?: boolean;
  is_featured?: boolean;
}

export default function ThumbnailView() {
  const params = useParams();
  const router = useRouter();
  const { credits, refreshCredits } = useCredits();
  const [thumbnail, setThumbnail] = useState<Thumbnail | null>(null);
  const [relatedThumbnails, setRelatedThumbnails] = useState<Thumbnail[]>([]);
  const [sameGenerationThumbnails, setSameGenerationThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [hasReacted, setHasReacted] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isReactionLoading, setIsReactionLoading] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Function to enhance thumbnails with user data
  const enhanceThumbnailsWithUserData = async (thumbnails: Thumbnail[]): Promise<Thumbnail[]> => {
    if (!thumbnails || thumbnails.length === 0) return thumbnails;

    // Get all user IDs that need data
    const userIdsToFetch = thumbnails
      .filter(thumb => thumb.user_id && (!thumb.user || !thumb.user.name))
      .map(thumb => thumb.user_id!)
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    if (userIdsToFetch.length === 0) return thumbnails;

    try {
      // Batch fetch user data
      const userDataMap = await userDataCache.batchGetUserData(userIdsToFetch);

      // Enhance thumbnails with user data
      return thumbnails.map(thumb => {
        if (!thumb.user_id) return thumb;
        
        const userData = userDataMap.get(thumb.user_id);
        if (userData && (!thumb.user || !thumb.user.name)) {
          return {
            ...thumb,
            user: {
              id: userData.id,
              name: userData.name,
              avatar_url: userData.avatar_url,
              email: userData.email
            }
          };
        }
        return thumb;
      });
    } catch (error) {
      console.error('Error enhancing thumbnails with user data:', error);
      return thumbnails;
    }
  };

  useEffect(() => {
    // Get current user using smart cache
    const fetchUser = async () => {
      try {
        const userData = await getUserWithFallback();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    // Check if user has reacted to this thumbnail
    if (user && thumbnail?.id) {
      // Run both checks in parallel for faster loading
      Promise.all([
        checkUserReaction(),
        getReactionCount()
      ]).catch(error => {
        console.error('Error checking reactions:', error);
      });
    }
  }, [user, thumbnail?.id]);

  const checkUserReaction = async () => {
    if (!user || !thumbnail?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('has_user_reacted', {
        p_user_id: user.id,
        p_thumbnail_id: parseInt(thumbnail.id),
        p_reaction_type: 'love'
      });
      
      if (!error && data !== null) {
        setHasReacted(data);
      }
    } catch (error) {
      console.error('Error checking user reaction:', error);
    }
  };

  const getReactionCount = async () => {
    if (!thumbnail?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_reaction_count', {
        p_thumbnail_id: parseInt(thumbnail.id),
        p_reaction_type: 'love'
      });
      
      if (!error && data !== null) {
        setReactionCount(data);
      }
    } catch (error) {
      console.error('Error getting reaction count:', error);
    }
  };

  const handleReaction = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Get current user using smart cache if not available
    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await getUserWithFallback();
        if (currentUser) {
          setUser(currentUser);
        } else {
          toast.error("Please sign in to react to thumbnails");
          return;
        }
      } catch (error) {
        console.error('Error getting user from cache:', error);
        toast.error("Please sign in to react to thumbnails");
        return;
      }
    }

    if (!currentUser) {
      toast.error("Please sign in to react to thumbnails");
      return;
    }

    if (!thumbnail?.id || isReactionLoading) return;

    setIsReactionLoading(true);

    // Show big heart animation for likes
    if (!hasReacted) {
      setShowBigHeart(true);
      setTimeout(() => setShowBigHeart(false), 1000);
    }

    try {
      const { data, error } = await supabase.rpc('toggle_reaction', {
        p_user_id: currentUser.id,
        p_thumbnail_id: parseInt(thumbnail.id),
        p_reaction_type: 'love'
      });
      
      if (error) {
        console.error('Error toggling reaction:', error);
        toast.error("Failed to react to thumbnail");
        return;
      }
      
      // Update local state
      setHasReacted(!hasReacted);
      setReactionCount(prev => hasReacted ? prev - 1 : prev + 1);
      
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error("Failed to react to thumbnail");
    } finally {
      setIsReactionLoading(false);
    }
  };

  useEffect(() => {
    const fetchThumbnail = async () => {
      if (!params.id) return;
      setLoading(true);
      try {
        // Fetch the specific thumbnail
        const { data: thumbnailData, error } = await supabase
          .from("thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .eq("id", params.id)
          .single();
        if (error) throw error;
        
        // Enhance thumbnail with user data
        const enhancedThumbnail = await enhanceThumbnailsWithUserData([thumbnailData]);
        console.log('🔍 Enhanced thumbnail user data:', {
          original: thumbnailData.user,
          enhanced: enhancedThumbnail[0].user,
          user_id: thumbnailData.user_id
        });
        setThumbnail(enhancedThumbnail[0]);

        // Fetch other images from the same generation using group_id
        if (thumbnailData?.group_id) {
          const { data: sameGenData } = await supabase
            .from("thumbnails")
            .select("*, user:users_meta(id, name, avatar_url)")
            .eq("group_id", thumbnailData.group_id)
            .neq("id", params.id) // Exclude the current thumbnail
            .order("created_at", { ascending: false })
            .limit(4);

          if (sameGenData) {
            // Enhance same generation thumbnails with user data
            const enhancedSameGen = await enhanceThumbnailsWithUserData(sameGenData);
            setSameGenerationThumbnails(enhancedSameGen);
          }
        }

        // Fetch related thumbnails with AI-powered relevance
        let related: Thumbnail[] = [];
        
        // 1. Extract key keywords from the current thumbnail's prompt using AI
        if (thumbnailData?.prompt) {
          try {
            // Use Gemini 2.0 Flash to extract 2-5 key words
            const geminiResponse = await fetch('/api/extract-keywords', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: thumbnailData.prompt })
            });
            
            if (geminiResponse.ok) {
              const { keywords } = await geminiResponse.json();
              
              // Search for thumbnails with similar keywords (get 8-12 total)
              const maxPerKeyword = Math.ceil(12 / keywords.length);
              
              for (const keyword of keywords) {
                if (related.length >= 12) break;
                
                const { data: similar } = await supabase
                  .from("thumbnails")
                  .select("*, user:users_meta(id, name, avatar_url)")
                  .or(`prompt.ilike.%${keyword}%,prompt.ilike.${keyword}%,prompt.ilike.%${keyword}`)
                  .neq("id", params.id)
                  .neq("group_id", thumbnailData.group_id)
                  .eq("is_hidden", false)
                  .order("created_at", { ascending: false })
                  .limit(maxPerKeyword);
                  
                if (similar && similar.length > 0) {
                  const existingIds = related.map(t => t.id);
                  const newThumbs = similar.filter(t => !existingIds.includes(t.id));
                  related = [...related, ...newThumbs];
                }
              }
            }
          } catch (error) {
            console.error('Error extracting keywords:', error);
            // Fallback to original method
            const searchQueries = generateSearchQueries(thumbnailData.prompt);
            for (const query of searchQueries) {
              if (related.length >= 12) break;
              
              const { data: similar } = await supabase
                .from("thumbnails")
                .select("*, user:users_meta(id, name, avatar_url)")
                .ilike("prompt", query)
                .neq("id", params.id)
                .neq("group_id", thumbnailData.group_id)
                .neq("user_id", thumbnailData.user_id) // Exclude current user's thumbnails
                .eq("is_hidden", false)
                .order("created_at", { ascending: false })
                .limit(12 - related.length);
                
              if (similar && similar.length > 0) {
                const existingIds = related.map(t => t.id);
                const newThumbs = similar.filter(t => !existingIds.includes(t.id));
                related = [...related, ...newThumbs];
              }
            }
          }
        }

        // 2. If we don't have 12 yet, add thumbnails from other users with similar themes
        if (related.length < 12) {
          const { data: similarUsers } = await supabase
            .from("thumbnails")
            .select("*, user:users_meta(id, name, avatar_url)")
            .neq("id", params.id)
            .neq("group_id", thumbnailData.group_id)
            .neq("user_id", thumbnailData.user_id) // Exclude current user's thumbnails
            .eq("is_hidden", false)
            .or("is_public.eq.true,is_featured.eq.true")
            .order("created_at", { ascending: false })
            .limit(12 - related.length);
            
          if (similarUsers && similarUsers.length > 0) {
            const existingIds = related.map(t => t.id);
            const newThumbs = similarUsers.filter(t => !existingIds.includes(t.id));
            related = [...related, ...newThumbs];
          }
        }

        // Shuffle the related thumbnails for better variety
        related = related.sort(() => Math.random() - 0.5).slice(0, 12);
        
        // Enhance related thumbnails with user data
        const enhancedRelated = await enhanceThumbnailsWithUserData(related);
        setRelatedThumbnails(enhancedRelated);
      } catch (error) {
        console.error("Error fetching thumbnail:", error);
        toast.error("Failed to load thumbnail");
      } finally {
        setLoading(false);
      }
    };

    fetchThumbnail();
  }, [params.id]);

  const handleBack = () => {
    // Check if there's a previous page in history
    if (window.history.length > 1) {
      // Use router.back() to preserve scroll position and state
      router.back();
    } else {
      // If no previous page, navigate to homepage
      router.push('/');
    }
  };

  const handleCopy = () => {
    if (!thumbnail) return;
    navigator.clipboard.writeText(thumbnail.prompt);
    setCopied(true);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopied(false), 1200);
  };

  const handleDownload = async () => {
    if (!thumbnail) return;
    setDownloadLoading(true);
    try {
      const link = document.createElement("a");
      link.href = thumbnail.image_url;
      link.download = `thumbnail-${thumbnail.id}.jpg`;
      link.click();
      toast.success("Download started!");
    } catch (error) {
      toast.error("Download failed");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleShare = () => {
    if (!thumbnail) return;
    const url = `${window.location.origin}/view/${thumbnail.id}`;
    if (navigator.share) {
      navigator.share({
        title: "Check out this thumbnail!",
        url,
      }).catch((error) => {
        // Only show toast if it's not a user cancellation
        if (error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Share URL copied to clipboard!");
    }
  };

  const handleRegenerate = async () => {
    if (!thumbnail) return;
    setRegenLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: thumbnail.prompt,
          is_public: thumbnail.is_public,
          text_position: thumbnail.text_position || "auto",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }
      toast.success("Thumbnail regenerated successfully!");
      await refreshCredits();
      window.location.reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegenLoading(false);
    }
  };

  // Bulk download/share for related thumbnails
  const handleBulkDownload = async () => {
    // Combine selected from both related and same generation if both are visible
    const allThumbs = [...relatedThumbnails, ...sameGenerationThumbnails];
    const selectedThumbs = allThumbs.filter(t => selectedIds.includes(t.id));
    if (selectedThumbs.length === 0) return;
    
    setIsBulkDownloading(true);
    try {
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
    // Combine selected from both related and same generation if both are visible
    const allThumbs = [...relatedThumbnails, ...sameGenerationThumbnails];
    const selectedThumbs = allThumbs.filter(t => selectedIds.includes(t.id));
    const urls = selectedThumbs.map(t => `${window.location.origin}/view/${t.id}`);
    const shareText = urls.join("\n\n");
    if (navigator.share) {
      navigator.share({
        title: "Check out these thumbnails!",
        text: shareText,
      }).catch((error) => {
        // Only show toast if it's not a user cancellation
        if (error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share URLs copied to clipboard!");
    }
  };

  // Handlers for ThumbnailCard actions in related thumbnails
  const handleRelatedRegenerate = (prompt: string, is_public: boolean, text_position: string) => {
    // Just call the main regenerate function with the same logic
    handleRegenerate();
  };

  const handleRelatedCopy = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  const handleRelatedDownload = (image_url: string, id: string) => {
    const link = document.createElement("a");
    link.href = image_url;
    link.download = `thumbnail-${id}.jpg`;
    link.click();
  };

  const handleRelatedShare = (id: string) => {
    const url = `${window.location.origin}/view/${id}`;
    if (navigator.share) {
      navigator.share({
        title: "Check out this thumbnail!",
        url,
      }).catch((error) => {
        // Only show toast if it's not a user cancellation
        if (error.name !== 'AbortError') {
          toast.error("Failed to share");
        }
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Share URL copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#171717] z-50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-32 mb-4" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!thumbnail) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-[#171717] z-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Thumbnail not found</h1>
          <Button onClick={handleBack}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#171717] z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4">
        {/* Close button */}
        <div className="flex justify-between mb-6">
        <div className="px-0 py-0 md:py-1">
        <Link href="/" className="px-0 py-0 md:py-1 flex items-center" aria-label="Go to homepage">
        <img
          src="/yoklick.png"
          alt="Yoklick-logo"
          className="h-[1.5rem] w-[7rem] hidden md:block dark:hidden"
        />
        <img
          src="/yoklick-logo-dark-mode.png"
          alt="Yoklick-logo-dark"
          className="h-[1.5rem] w-[7rem] hidden md:dark:block"
        />
        <img
          src="/yoklick-favicon-2.png"
          alt="Yoklick-logo"
          className="h-[2.5rem] w-[2.5rem] block md:hidden"
        />
      </Link>
      </div>
          <button
            onClick={handleBack}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-white hover:bg-primary/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main thumbnail */}
        <div className="max-w-4xl mx-auto">
          {/* Main Image */}
          <div className="relative mb-6">
            <div className="relative aspect-[16/9] w-full bg-muted rounded-xl overflow-hidden">
              <img 
                src={thumbnail.image_url} 
                alt={thumbnail.prompt} 
                className="object-cover w-full h-full" 
                onDoubleClick={handleReaction}
              />
              
              {/* Big Heart Animation */}
              {showBigHeart && (
                <div className="absolute inset-0 flex items-center justify-center z-30">
                  <div className="animate-ping">
                    <Heart className="h-16 w-16 text-red-500 fill-current" />
                  </div>
                </div>
              )}
              
              {/* Love Icon Overlay - Bottom Right */}
              <div className="absolute bottom-4 right-4 z-20">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isReactionLoading}
                  className={cn(
                    "h-10 w-10 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200",
                    hasReacted 
                      ? "text-red-500/80 hover:text-red-600/80 bg-white" 
                      : "bg-black/20 hover:bg-black/30 text-white",
                    isReactionLoading && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={handleReaction}
                >
                  <Heart className={cn("h-5 w-5", hasReacted ? "fill-current" : "", isReactionLoading && "animate-pulse")} />
                </Button>
                {reactionCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {reactionCount > 99 ? '99+' : reactionCount}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy Prompt
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="flex items-center gap-2"
              >
                {regenLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloadLoading}
                className="flex items-center gap-2"
              >
                {downloadLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>

          {/* Creator Info */}
          <Link href={`/thumbnails/${thumbnail.user?.id || thumbnail.user_id}`} className="flex items-center gap-3 mb-6 p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-3">
              {getUserAvatar(thumbnail.user) ? (
                <img
                  src={getUserAvatar(thumbnail.user)!}
                  alt={`${getUserDisplayName(thumbnail.user)}'s avatar`}
                  className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20">
                  {getUserInitials(thumbnail.user)}
                </div>
              )}
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">
                  {getUserDisplayName(thumbnail.user)}
                </span>
                {thumbnail.created_at && (
                  <span className="text-sm text-muted-foreground">
                    Created {formatUserDate(thumbnail.created_at)}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Prompt */}
          {/* <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Prompt</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {cleanPrompt(thumbnail.prompt)}
            </p>
          </div> */}
        </div>

        {/* Other images from the same generation */}
        {/* Other images from the same generation */}
      {(sameGenerationThumbnails.length > 0) && (
        <div className="animate-element animate-delay-400 mt-4">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Other Images from This Generation</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {
              // Show actual images
              sameGenerationThumbnails.map((sameGen) => (
                <button
                  key={sameGen.id}
                  onClick={() => router.push(`/view/${sameGen.id}`)}
                  className="aspect-[16/9] rounded-lg overflow-hidden transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img 
                    src={sameGen.image_url} 
                    alt={sameGen.prompt} 
                    className="object-cover w-full h-full"
                  />
                </button>
              ))
            }
          </div>
        </div>
      )}

        {/* Related thumbnails */}
        {relatedThumbnails.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-4">Related Thumbnails</h3>
            <ThumbnailsGrid
              thumbnails={relatedThumbnails}
              loading={false}
              gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              quantity={relatedThumbnails.length}
              isRegenerating={false}
              showCheckbox={true}
              key={`related-grid-${user ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
            />
          </div>
        )}
        
        {/* Bulk Action Bar - Works for both sections */}
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
              {isBulkDownloading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Download"
              )}
            </Button>
            <Button onClick={handleBulkShare}>Share</Button>
            <Button variant="ghost" onClick={() => setSelectedIds([])}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  );
} 