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
import NoResultsFound from "@/app/components/NoResultsFound";
import NoThumbnailsFound from "@/app/components/NoThumbnailsFound";
import { bulkDownloadImages } from "@/app/lib/bulkDownload";
import { getUserWithFallback } from "@/app/lib/userCache";
import { ArrowLeft, Search } from "lucide-react";
import { getUserDisplayName, getUserAvatar, getUserInitials } from "@/app/lib/userUtils";
import React from "react";

interface UserProfile {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

export default function UserProfilePage({ params }: { params: Promise<{ user_id: string }> }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userThumbnails, setUserThumbnails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false); // Track if user is loaded
  const { refreshCredits } = useCredits();
  const { isGenerating, stopGeneration } = useGeneration();
  const router = useRouter();

  // Unwrap params using React.use()
  const resolvedParams = React.use(params);
  const userId = resolvedParams.user_id;

  // Fetch user session and user profile data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch current user session using smart cache
        const userData = await getUserWithFallback();
        setUser(userData);
        setUserLoaded(true); // Mark user as loaded

        // Fetch user profile data using the API endpoint that bypasses RLS
        const response = await fetch("/api/users/get-user-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userIds: [userId] }),
        });

        if (response.ok) {
          const { users } = await response.json();
          if (users && users.length > 0) {
            setUserProfile(users[0]);
          } else {
            toast.error("User not found");
            return;
          }
        } else {
          toast.error("User not found");
          return;
        }

        // Fetch user's public thumbnails with NEWEST FIRST ORDERING
        const { data: thumbnails, error: thumbnailsError } = await supabase
          .from("thumbnails")
          .select("id, image_url, prompt, created_at, user_id, group_id, is_hidden, is_public, is_featured, user:users_meta(id, name, avatar_url)")
          .eq("user_id", userId)
          .eq("is_public", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }); // Order by newest first

        if (thumbnailsError) {
          toast.error("Failed to load thumbnails");
          return;
        }

        // Show thumbnails in order (newest first) - no shuffling
        setUserThumbnails(thumbnails || []);

      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Network') || error.message.includes('fetch')) {
            toast.error("Network error. Please check your connection and refresh the page.");
          } else {
            toast.error("Failed to load user profile. Please refresh the page.");
          }
        } else {
          toast.error("Failed to load user profile");
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const filteredThumbnails = userThumbnails.filter((thumbnail) =>
    thumbnail.prompt?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRegenerate = async (thumbnailId: string) => {
    // Check if user is authenticated
    if (!user) {
      toast.error("Please sign in to regenerate thumbnails");
      router.push("/auth/signin");
      return;
    }

    // Show perfect skeleton loading immediately
    setUserThumbnails([null, null, null, null, null, null, null, null, null]);
    setLoading(true);
    
    try {
      const response = await fetch("/api/regenerate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ thumbnailId }),
      });

      if (response.ok) {
        // Keep skeleton visible for a moment to show generation progress
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        toast.success("Thumbnail regenerated successfully!");
        refreshCredits();
        
                 // Refresh the thumbnails instead of reloading the page
        const { data: thumbnails, error: thumbnailsError } = await supabase
          .from("thumbnails")
          .select("id, image_url, prompt, created_at, user_id, group_id, is_hidden, is_public, is_featured, user:users_meta(id, name, avatar_url)")
          .eq("user_id", userId)
          .eq("is_public", true)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }); // Order by newest first

        if (!thumbnailsError && thumbnails) {
          // Show thumbnails in order (newest first) - no shuffling
          setUserThumbnails(thumbnails);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to regenerate thumbnail");
        setUserThumbnails([]);
      }
    } catch (error) {
      toast.error("Failed to regenerate thumbnail");
      setUserThumbnails([]);
    } finally {
      setLoading(false);
      stopGeneration(); // Stop global generation state
    }
  };

  const handleBulkDownload = async () => {
    const selectedThumbs = userThumbnails.filter(t => selectedIds.includes(t.id));
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
      toast.error("Failed to download thumbnails. Please try again.");
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkShare = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select thumbnails to share");
      return;
    }

    try {
      // Share logic here
      toast.success(`Sharing ${selectedIds.length} thumbnails...`);
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to share thumbnails");
    }
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-2 md:gap-8 py-8">
        {/* Headline Skeleton */}
        <div className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="hidden sm:block">
          <div className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
            <div className="h-12 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        
        {/* Profile Section Skeleton */}
        <div className="animate-element animate-delay-300 flex justify-center items-center">
          <div className="bg-white dark:bg-[#303030] rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-40"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Section Skeleton */}
        <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-64"></div>
        </div>

        {/* Thumbnails Grid Skeleton */}
        <ThumbnailsGrid
          thumbnails={[null, null, null, null, null, null, null, null, null]}
          loading={true}
          onRegenerate={handleRegenerate}
          gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          quantity={9}
          isRegenerating={false}
          showCheckbox={true}
        />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-2 md:gap-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">User Not Found</h1>
          <p className="text-gray-600 dark:text-white mb-6">The user you're looking for doesn't exist.</p>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-2 md:gap-8 py-8">
      {/* Headline - Always visible immediately */}
      {loading ? (
        <>
          <div className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="hidden sm:block">
            <div className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
              <div className="h-12 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </>
      ) : (
        <>
          <h1 className="animate-element animate-delay-100 text-2xl md:text-4xl font-bold text-center mb-1 tracking-tight leading-tight block md:hidden">
            <div>View </div>
            <span>{getUserDisplayName(userProfile)}'s <span className="text-primary">Thumbnails</span></span>
          </h1>
          <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 block sm:hidden">
            <span>Browse {getUserDisplayName(userProfile)}'s public thumbnails. Get inspired by their creative work.</span>
          </p>
          <div className="hidden sm:block">
            <h1 className="animate-element animate-delay-100 text-2xl md:text-5xl font-semibold text-center mb-4 tracking-tight leading-tight">
              {getUserDisplayName(userProfile)}'s <br /> Creative <span className="text-primary">Thumbnails</span>
            </h1>
            
            <p className="animate-element animate-delay-200 text-center text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto mb-2 mt-2">
              Browse {getUserDisplayName(userProfile)}'s public thumbnails. Get inspired by their creative work.
            </p>
          </div>
        </>
      )}
      
      {/* Profile Section - Always visible immediately (replaces PromptSection) */}
      <div className="animate-element animate-delay-300 flex justify-center items-center">
        {loading ? (
          <div className="bg-white rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-32"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-40"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#303030] rounded-xl shadow-lg border border-border p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                {getUserAvatar(userProfile) ? (
                  <img
                    src={getUserAvatar(userProfile)!}
                    alt={`${getUserDisplayName(userProfile)}'s avatar`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  getUserInitials(userProfile)
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {getUserDisplayName(userProfile)}
                </h2>
                <p className="text-gray-600 dark:text-white">
                  {userThumbnails.length} public thumbnails
                </p>
                {userProfile.email && (
                  <p className="text-sm text-gray-500 dark:text-white">
                    {userProfile.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User's Thumbnails Section - Show skeleton loading first */}
      {loading ? (
        <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse w-64"></div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row justify-between align-center mt-8 mb-2 gap-2 md:gap-0">
          <div><h2 className="text-xl md:text-2xl font-semibold">{getUserDisplayName(userProfile)}'s Thumbnails</h2></div>
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search thumbnails..."
            className="max-w-xs"
          />
        </div>
      )}
             {!loading && filteredThumbnails.length === 0 && search.trim() ? (
         <NoResultsFound 
           searchTerm={search.trim()} 
           onClearSearch={() => setSearch("")}
         />
       ) : (
         <ThumbnailsGrid
           thumbnails={loading ? [null, null, null, null, null, null, null, null, null] : filteredThumbnails}
           loading={loading}
           onRegenerate={handleRegenerate}
           gridClassName="grid-cols-1 sm:grid-cols-1 md:grid-cols-3 gap-4"
           selectedIds={selectedIds}
           setSelectedIds={setSelectedIds}
           quantity={loading || isGenerating ? 9 : filteredThumbnails.length}
           isRegenerating={false}
           showCheckbox={true}
           key={`thumbnails-grid-${userLoaded ? 'user-loaded' : 'user-loading'}`} // Force re-render when user loads
         />
       )}
      
      {/* End of content message */}
      {!loading && !isGenerating && filteredThumbnails.length === 0 && !search.trim() && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">This user hasn't shared any public thumbnails yet.</p>
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