"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { mapTextPositionToAPI } from "@/lib/utils";
import { supabase } from "@/app/lib/supabaseClient";
import { toast } from "sonner";
import Link from "next/link";
import { useMediaQuery } from "usehooks-ts";
import {
  Download,
  Share,
  Maximize2,
  RefreshCw,
  Heart,
  ChevronRight,
  Check,
  ChevronLeft
} from "lucide-react";
import ThumbnailDetails from "./ThumbnailDetails";
import { getUserInitials } from "@/app/lib/userUtils";
import { reactionCache } from "@/app/lib/reactionCache";
import { getUserWithFallback } from "@/app/lib/userCache";
import { useGeneration } from "@/app/context/GenerationContext";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  text_position?: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at?: string;
  user_id?: string;
  group_id?: string;
  is_hidden?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
}

interface ThumbnailCardProps {
  thumbnail: Thumbnail;
  className?: string;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  isSelectionMode?: boolean;
  showCheckbox?: boolean;
  bulkSelect?: boolean;
  hasReacted?: boolean;
  reactionCount?: number;
}

const ActionIcon = ({ children, ...props }: any) => (
  <Button
    size="icon"
    variant="ghost"
    className="h-8 w-8 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-opacity border-none shadow-none"
    {...props}
  >
    {children}
  </Button>
);

const formatGenerationDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month}, ${year}`;
};

const getUserDisplayNameWithFallback = (user: any) => {
  if (!user) return "Anonymous User";
  if (user.name && user.name.trim()) {
    return user.name;
  }
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    return emailPart;
  }
  return "Anonymous User";
};

export default function ThumbnailCard({
  thumbnail,
  className,
  selected = false,
  onSelect,
  isSelectionMode = false,
  showCheckbox = false,
  bulkSelect = false,
  hasReacted: preLoadedHasReacted,
  reactionCount: preLoadedReactionCount
}: ThumbnailCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [isCurrentlyRegenerating, setIsCurrentlyRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [hasReacted, setHasReacted] = useState(false);
  const [reactionCount, setReactionCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showBigHeart, setShowBigHeart] = useState(false);
  const [isReactionLoading, setIsReactionLoading] = useState(false);
  const [isReactionDataLoading, setIsReactionDataLoading] = useState(true);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTouchDevice = useMediaQuery("(pointer: coarse)");
  const { forceHomepageSkeleton } = useGeneration();

  const enhancedThumbnail = thumbnail;

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUserWithFallback();
        if (user) {
          setUser(user);
        }
      } catch (error) {
        // silent fail
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (preLoadedHasReacted !== undefined && preLoadedReactionCount !== undefined) {
      setHasReacted(preLoadedHasReacted);
      setReactionCount(preLoadedReactionCount);
      setIsReactionDataLoading(false);
    } else if (user && enhancedThumbnail?.id) {
      setIsReactionDataLoading(true);
      Promise.all([
        checkUserReaction(),
        getReactionCount()
      ]).then(() => {
        setIsReactionDataLoading(false);
      }).catch(() => {
        setIsReactionDataLoading(false);
      });
    }
  }, [user, enhancedThumbnail?.id, preLoadedHasReacted, preLoadedReactionCount]);

  const checkUserReaction = async () => {
    if (!user || !enhancedThumbnail?.id) return;
    try {
      const hasReacted = await reactionCache.getUserReactions(user.id).then(reactions => reactions.has(enhancedThumbnail.id));
      setHasReacted(hasReacted);
    } catch {
      setHasReacted(false);
    }
  };

  const getReactionCount = async () => {
    if (!enhancedThumbnail?.id) return;
    try {
      const count = await reactionCache.getReactionCount(enhancedThumbnail.id);
      setReactionCount(count);
    } catch {
      setReactionCount(0);
    }
  };

  const handleReaction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isReactionLoading) {
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      try {
        currentUser = await getUserWithFallback();
        if (currentUser) {
          setUser(currentUser);
        } else {
          toast.error("Please log in to react to thumbnails");
          return;
        }
      } catch {
        toast.error("Please log in to react to thumbnails");
        return;
      }
    }

    if (!currentUser) {
      toast.error("Please log in to react to thumbnails");
      return;
    }

    try {
      setIsReactionLoading(true);

      const { error: rpcError } = await supabase.rpc('toggle_reaction', {
        p_user_id: currentUser.id,
        p_thumbnail_id: parseInt(enhancedThumbnail.id),
        p_reaction_type: 'love'
      });

      if (!rpcError) {
        const newHasReacted = !hasReacted;
        setHasReacted(newHasReacted);
        setReactionCount(prev => newHasReacted ? prev + 1 : Math.max(0, prev - 1));
        reactionCache.invalidateUserCache(currentUser.id);
        if (!hasReacted) {
          setShowBigHeart(true);
          setTimeout(() => setShowBigHeart(false), 1000);
        }
        return;
      }

      try {
        if (hasReacted) {
          const { error: deleteError } = await supabase
            .from('thumbnail_reactions')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('thumbnail_id', parseInt(enhancedThumbnail.id))
            .eq('reaction_type', 'love');
          if (deleteError) {
            toast.error("Failed to react to thumbnail");
            return;
          }
          setHasReacted(false);
          setReactionCount(prev => Math.max(0, prev - 1));
        } else {
          const { error: insertError } = await supabase
            .from('thumbnail_reactions')
            .insert({
              user_id: currentUser.id,
              thumbnail_id: parseInt(enhancedThumbnail.id),
              reaction_type: 'love',
              created_at: new Date().toISOString()
            });
          if (insertError) {
            toast.error("Failed to react to thumbnail");
            return;
          }
          setHasReacted(true);
          setReactionCount(prev => prev + 1);
          setShowBigHeart(true);
          setTimeout(() => setShowBigHeart(false), 1000);
        }
        reactionCache.invalidateUserCache(currentUser.id);
      } catch {
        const newHasReacted = !hasReacted;
        setHasReacted(newHasReacted);
        setReactionCount(prev => newHasReacted ? prev + 1 : Math.max(0, prev - 1));
        if (!hasReacted) {
          setShowBigHeart(true);
          setTimeout(() => setShowBigHeart(false), 1000);
        }
        toast.success(newHasReacted ? "Liked!" : "Unliked!");
      }
    } catch {
      toast.error("Failed to react to thumbnail");
    } finally {
      setIsReactionLoading(false);
    }
  };

  const handleDoubleClick = () => {
    if (!hasReacted) {
      const dummyEvent = {
        stopPropagation: () => {},
        preventDefault: () => {}
      } as React.MouseEvent;
      handleReaction(dummyEvent);
    }
  };

  const handleLongPress = () => {
    setIsLongPressed(true);
    setTimeout(() => setIsLongPressed(false), 500);
  };

  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      handleLongPress();
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // const handleCopy = async (e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   try {
  //     await navigator.clipboard.writeText(enhancedThumbnail.prompt);
  //     setCopied(true);
  //     toast.success("Prompt copied to clipboard!");
  //     setTimeout(() => setCopied(false), 2000);
  //   } catch {
  //     toast.error("Failed to copy prompt");
  //   }
  // };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadLoading(true);
      if (!enhancedThumbnail.image_url) {
        throw new Error("No image URL available");
      }
      try {
        const response = await fetch(enhancedThumbnail.image_url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('Response is not an image');
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thumbnail-${enhancedThumbnail.id}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        toast.success("Thumbnail downloaded successfully!");
      } catch {
        try {
          window.open(enhancedThumbnail.image_url, '_blank');
          toast.success("Thumbnail Downloaded Successfully");
        } catch {
          toast.error("Failed to download thumbnail. Please try right-clicking and 'Save image as'");
        }
      }
    } catch {
      toast.error("Failed to download thumbnail. Please try right-clicking and 'Save image as'");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/view/${enhancedThumbnail.id}`;
      const shareText = `${enhancedThumbnail.prompt}\n\n${shareUrl}`;
      if (navigator.share) {
        await navigator.share({
          title: "Check out this thumbnail!",
          text: shareText,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("Share URL copied to clipboard!");
      }
    } catch {
      toast.error("Failed to share thumbnail");
    }
  };

  const handleRegenerateClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowConfirm(false);
    setIsCurrentlyRegenerating(true);
    forceHomepageSkeleton();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancedThumbnail.prompt,
          text_position: mapTextPositionToAPI(enhancedThumbnail.text_position || 'center'),
          is_public: enhancedThumbnail.is_public || false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }
      toast.success("Thumbnail regenerated successfully!");
      window.location.reload();
    } catch {
      toast.error("Failed to regenerate thumbnail");
    } finally {
      setIsCurrentlyRegenerating(false);
    }
  };

  const handleModalRegenerate = async () => {
    setIsCurrentlyRegenerating(true);
    forceHomepageSkeleton();
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancedThumbnail.prompt,
          text_position: mapTextPositionToAPI(enhancedThumbnail.text_position || 'center'),
          is_public: enhancedThumbnail.is_public || false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }
      toast.success("Thumbnail regenerated successfully!");
      window.location.reload();
    } catch {
      toast.error("Failed to regenerate thumbnail");
    } finally {
      setIsCurrentlyRegenerating(false);
    }
  };

  const handleThumbnailClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(enhancedThumbnail.id, !selected);
    } else {
      setModalOpen(true);
    }
  };

  const handleModalDownload = async () => {
    try {
      try {
        const response = await fetch(enhancedThumbnail.image_url, {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('Response is not an image');
        }
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thumbnail-${enhancedThumbnail.id}.jpg`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        toast.success("Thumbnail downloaded successfully!");
      } catch {
        try {
          window.open(enhancedThumbnail.image_url, '_blank');
          toast.success("Image opened in new tab - you can save it manually!");
        } catch {
          toast.error("Failed to download thumbnail. Please try right-clicking and 'Save image as'.");
        }
      }
    } catch {
      toast.error("Failed to download thumbnail. Please try right-clicking and 'Save image as'.");
    }
  };

  const SelectBox = (showCheckbox || isSelectionMode || bulkSelect) && (
    <div className="absolute top-2 left-2 z-30 ">
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-8 w-8 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200 hover:text-white",
          selected 
            ? "bg-primary text-white hover:bg-primary/80" 
            : "bg-black/20 text-white hover:bg-black/30",
          isTouchDevice ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(thumbnail.id, !selected);
        }}
      >
        {selected ? (
          <Check className="h-4 w-4" />
        ) : (
          <div className="h-4 w-4 border-2 border-white rounded-sm" />
        )}
      </Button>
    </div>
  );

  if (!thumbnail || !hydrated) {
    return (
      <div className={cn(
        "relative group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col col-span-1 aspect-[16/9]",
        className
      )}>
        <Skeleton className="absolute inset-0 w-full h-full" />
      </div>
    );
  }

  return (
    <>
      {isMobile ? (
        <Drawer open={modalOpen} onOpenChange={setModalOpen}>
          <DrawerTrigger asChild>
            <div
              className={cn(
                "relative group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col col-span-1 aspect-[16/9]",
                className,
                selected ? "border-3 border-primary" : ""
              )}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {SelectBox}
              <div
                className="relative aspect-[16/9] w-full bg-muted cursor-pointer"
                onClick={e => {
                  const target = e.target as HTMLElement;
                  const current = e.currentTarget as HTMLElement;
                  const isImage = target.tagName === 'IMG';
                  const isBackground = target === current;
                  if (!isImage && !isBackground) return;
                  const loveButton = target.closest('[data-love-button]');
                  if (loveButton) return;
                  setModalOpen(true);
                }}
                onDoubleClick={handleDoubleClick}
              >
                {!loaded && <Skeleton className="absolute inset-0 w-full h-full" />}
                <img
                  src={enhancedThumbnail.image_url}
                  alt={enhancedThumbnail.prompt}
                  className={cn(
                    "object-cover w-full h-full transition-all duration-700",
                    loaded ? "blur-0" : "blur-md"
                  )}
                  onLoad={() => setLoaded(true)}
                  style={{ display: loaded ? "block" : "none" }}
                />
                {showBigHeart && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="animate-ping">
                      <Heart className="h-16 w-16 text-red-500 fill-current" />
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 z-20">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-opacity border-none shadow-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllActions(!showAllActions);
                    }}
                  >
                    {showAllActions ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {showAllActions && (
                  <div className="absolute top-2 right-2 z-20 flex gap-2 pointer-events-auto mr-10">
                    <ActionIcon
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setShowConfirm(true);
                      }}
                      title="Regenerate"
                      disabled={isCurrentlyRegenerating}
                    >
                      <RefreshCw className={`h-4 w-4 ${isCurrentlyRegenerating ? "animate-spin" : ""}`} />
                    </ActionIcon>
                    <ActionIcon onClick={handleDownload} title="Download" disabled={downloadLoading}>
                      {downloadLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </ActionIcon>
                    <ActionIcon onClick={handleShare} title="Share">
                      <Share className="h-4 w-4" />
                    </ActionIcon>
                    <Link href={thumbnail.id ? `/view/${thumbnail.id}` : "#"}>
                      <ActionIcon title="Open Fullscreen">
                        <Maximize2 className="h-4 w-4" />
                      </ActionIcon>
                    </Link>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 z-20" onClick={(e) => e.stopPropagation()} data-love-button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200",
                      hasReacted 
                        ? "text-red-500/80 hover:text-red-600/80 bg-white" 
                        : "bg-black/20 hover:bg-black/30 text-white hover:text-white"
                    )}
                    onClick={handleReaction}
                  >
                    <Heart className={cn(
                      "h-4 w-4", 
                      hasReacted ? "fill-current" : ""
                    )} />
                  </Button>
                  {hasReacted && reactionCount > 0 && (
                    <div 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                      onClick={handleReaction}
                    >
                      {reactionCount > 99 ? '99+' : reactionCount}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <Link href={`/thumbnails/${enhancedThumbnail.user?.id || enhancedThumbnail.user_id}`} className="flex flex-col items-start bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 hover:bg-black/60 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-medium text-primary">
                        {enhancedThumbnail.user?.avatar_url ? (
                          <img 
                            src={enhancedThumbnail.user.avatar_url} 
                            alt={getUserDisplayNameWithFallback(enhancedThumbnail.user)}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getUserInitials(enhancedThumbnail.user)
                        )}
                      </div>
                      <div className="flex flex-col items-start">
                      <span className="font-medium text-white text-sm">
                        {getUserDisplayNameWithFallback(enhancedThumbnail.user)}
                      </span>
                      {enhancedThumbnail.created_at && (
                        <span className="text-xs text-white/70">
                          {formatGenerationDate(enhancedThumbnail.created_at)}
                        </span>
                      )}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh] overflow-hidden rounded-t-[20px]">
            <DrawerTitle asChild>
              <VisuallyHidden>Thumbnail Details</VisuallyHidden>
            </DrawerTitle>
            <DrawerDescription asChild>
              <VisuallyHidden>Thumbnail details and actions</VisuallyHidden>
            </DrawerDescription>
            <div className="flex flex-col h-full overflow-auto">
              <div className="relative w-full bg-muted mb-2 h-46 flex items-center outline-none border-none justify-center flex-shrink-0 rounded-t-[20px] overflow-hidden">
                <div className="absolute inset-0 bg-glow-multi blur-3xl scale-150 opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 blur-2xl scale-125 opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-tl from-primary/25 via-transparent to-primary/15 blur-xl scale-110 opacity-70"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-primary/10 blur-lg scale-105 opacity-60"></div>
                <div className="absolute inset-0 bg-gradient-to-bl from-primary/15 via-transparent to-primary/5 blur-md scale-100 opacity-50"></div>
                <div className="absolute inset-0 bg-glow-primary blur-3xl scale-150 opacity-40 glow-animation"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-sm scale-110 opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-radial-gradient blur-2xl scale-120 opacity-30"></div>
                <img 
                  src={enhancedThumbnail.image_url} 
                  alt={enhancedThumbnail.prompt} 
                  className="relative z-10 object-cover w-full h-full rounded-md shadow-2xl"
                />
              </div>
              <ThumbnailDetails
                thumbnail={enhancedThumbnail}
                copied={copied}
                regenLoading={isCurrentlyRegenerating}
                handleCopy={() => {
                }}
                handleRegenerate={() => handleRegenerateClick()}
                handleDownload={handleModalDownload}
                handleShare={() => {
                  try {
                    const shareUrl = `${window.location.origin}/view/${enhancedThumbnail.id}`;
                    const shareText = `${enhancedThumbnail.prompt}\n\n${shareUrl}`;
                    if (navigator.share) {
                      navigator.share({
                        title: "Check out this thumbnail from Yoklick!",
                        text: shareText,
                        url: shareUrl
                      });
                    } else {
                      navigator.clipboard.writeText(shareText);
                      toast.success("Share URL copied to clipboard!");
                    }
                  } catch {
                    toast.error("Failed to share thumbnail");
                  }
                }}
                onCloseModal={() => setModalOpen(false)}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "relative group rounded-xl overflow-hidden hover:shadow-lg transition-shadow border border-border flex flex-col col-span-1 aspect-[16/9]",
                className,
                selected ? "border-2 border-primary" : ""
              )}
            >
              {SelectBox}
              <div
                className="relative aspect-[16/9] w-full bg-muted cursor-pointer"
                onClick={e => {
                  const target = e.target as HTMLElement;
                  const current = e.currentTarget as HTMLElement;
                  const isImage = target.tagName === 'IMG';
                  const isBackground = target === current;
                  if (!isImage && !isBackground) return;
                  const loveButton = target.closest('[data-love-button]');
                  if (loveButton) return;
                  setModalOpen(true);
                }}
                onDoubleClick={handleDoubleClick}
              >
                {!loaded && <Skeleton className="absolute inset-0 w-full h-full" />}
                <img
                  src={enhancedThumbnail.image_url}
                  alt={enhancedThumbnail.prompt}
                  className={cn(
                    "object-cover w-full h-full transition-all duration-700",
                    loaded ? "blur-0" : "blur-md"
                  )}
                  onLoad={() => setLoaded(true)}
                  style={{ display: loaded ? "block" : "none" }}
                />
                {showBigHeart && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="animate-ping">
                      <Heart className="h-16 w-16 text-red-500 fill-current" />
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2 z-20 flex gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <ActionIcon
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowConfirm(true);
                    }}
                    title="Regenerate"
                    disabled={isCurrentlyRegenerating}
                  >
                    <RefreshCw className={`h-4 w-4 ${isCurrentlyRegenerating ? "animate-spin" : ""}`} />
                  </ActionIcon>
                  <ActionIcon onClick={handleDownload} title="Download" disabled={downloadLoading}>
                    {downloadLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </ActionIcon>
                  <ActionIcon onClick={handleShare} title="Share">
                    <Share className="h-4 w-4" />
                  </ActionIcon>
                  <Link href={thumbnail.id ? `/view/${thumbnail.id}` : "#"}>
                    <ActionIcon title="Open Fullscreen">
                      <Maximize2 className="h-4 w-4" />
                    </ActionIcon>
                  </Link>
                </div>
                <div className="absolute bottom-2 right-2 z-20" onClick={(e) => e.stopPropagation()} data-love-button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200",
                      hasReacted 
                        ? "text-red-500/80 hover:text-red-600/80 bg-white" 
                        : "bg-black/20 hover:bg-black/30 text-white hover:text-white"
                    )}
                    onClick={handleReaction}
                  >
                    <Heart className={cn(
                      "h-4 w-4", 
                      hasReacted ? "fill-current" : ""
                    )} />
                  </Button>
                  {hasReacted && reactionCount > 0 && (
                    <div 
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
                      onClick={handleReaction}
                    >
                      {reactionCount > 99 ? '99+' : reactionCount}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <Link href={`/thumbnails/${enhancedThumbnail.user?.id || enhancedThumbnail.user_id}`} className="flex flex-col items-start bg-black/40 backdrop-blur-sm rounded-full px-3 py-2 border border-white/10 hover:bg-black/60 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-medium text-primary">
                      {enhancedThumbnail.user?.avatar_url ? (
                          <img 
                            src={enhancedThumbnail.user.avatar_url} 
                            alt={getUserDisplayNameWithFallback(enhancedThumbnail.user)}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getUserInitials(enhancedThumbnail.user)
                        )}
                      </div>
                      <div className="flex flex-col items-start">
                      <span className="font-medium text-white text-sm">
                        {getUserDisplayNameWithFallback(enhancedThumbnail.user)}
                      </span>
                      {enhancedThumbnail.created_at && (
                        <span className="text-xs text-white/70">
                          {formatGenerationDate(enhancedThumbnail.created_at)}
                        </span>
                      )}
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="w-full max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto m-0">
            <DialogTitle asChild>
              <VisuallyHidden>Thumbnail Details</VisuallyHidden>
            </DialogTitle>
            <DialogDescription asChild>
              <VisuallyHidden>Thumbnail details and actions</VisuallyHidden>
            </DialogDescription>
            <div className="relative w-full aspect-[16/9] bg-muted mb-0 h-72">
              <img src={enhancedThumbnail.image_url} alt={enhancedThumbnail.prompt} className="object-cover w-full h-full rounded-md" />
            </div>
            <ThumbnailDetails
              thumbnail={enhancedThumbnail}
              copied={copied}
              regenLoading={isCurrentlyRegenerating}
              handleCopy={() => {}}
              handleRegenerate={handleModalRegenerate}
              handleDownload={handleModalDownload}
              handleShare={() => {
                try {
                  const shareUrl = `${window.location.origin}/view/${enhancedThumbnail.id}`;
                  const shareText = `${enhancedThumbnail.prompt}\n\n${shareUrl}`;
                  if (navigator.share) {
                    navigator.share({
                      title: "Check out this thumbnail!",
                      text: shareText,
                      url: shareUrl
                    });
                  } else {
                    navigator.clipboard.writeText(shareText);
                    toast.success("Share URL copied to clipboard!");
                  }
                } catch {
                  toast.error("Failed to share thumbnail");
                }
              }}
              onCloseModal={() => setModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
      {showConfirm && (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogTitle>Confirm Regeneration</DialogTitle>
            <DialogDescription>
              Are you sure you want to regenerate this thumbnail? This action will take 4 credits.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button onClick={handleConfirmRegenerate} disabled={isCurrentlyRegenerating}>
                {isCurrentlyRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}