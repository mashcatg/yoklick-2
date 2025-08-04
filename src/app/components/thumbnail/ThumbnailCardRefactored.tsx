"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useMediaQuery } from "usehooks-ts";
import { Heart } from "lucide-react";
import ThumbnailDetails from "../ThumbnailDetails";
import { ThumbnailCardProps } from '@/app/types/thumbnail';
import { useThumbnailActions } from '@/app/hooks/useThumbnailActions';
import { useThumbnailReaction } from '@/app/hooks/useThumbnailReaction';
import { ThumbnailImage } from './ThumbnailImage';
import { ThumbnailReaction } from './ThumbnailReaction';
import { ThumbnailUserInfo } from './ThumbnailUserInfo';
import { ThumbnailActions } from './ThumbnailActions';
import { ThumbnailSelection } from './ThumbnailSelection';
import { generateThumbnailKey, isThumbnailLoading } from '@/app/lib/thumbnailUtils';

export default function ThumbnailCardRefactored({
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const isTouchDevice = useMediaQuery("(pointer: coarse)");

  // Custom hooks
  const {
    downloadLoading,
    isCurrentlyRegenerating,
    copied,
    handleCopy,
    handleDownload,
    handleShare,
    handleRegenerate
  } = useThumbnailActions(thumbnail);

  const {
    hasReacted,
    reactionCount,
    isReactionLoading,
    showBigHeart,
    isReactionDataLoading,
    handleReaction
  } = useThumbnailReaction(thumbnail.id, preLoadedHasReacted, preLoadedReactionCount);

  // Handle thumbnail click
  const handleThumbnailClick = () => {
    if (isSelectionMode && onSelect) {
      onSelect(thumbnail.id, !selected);
    } else {
      setModalOpen(true);
    }
  };

  // Handle double click for reaction
  const handleDoubleClick = () => {
    if (!hasReacted) {
      const dummyEvent = {
        stopPropagation: () => {},
        preventDefault: () => {}
      } as React.MouseEvent;
      handleReaction(dummyEvent);
    }
  };

  // Handle long press
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

  // Handle regenerate with confirmation
  const handleRegenerateClick = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmRegenerate = async () => {
    setShowConfirm(false);
    await handleRegenerate();
  };

  // Show skeleton for null thumbnails (loading state)
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
              <ThumbnailSelection
                selected={selected}
                onSelect={onSelect || (() => {})}
                thumbnailId={thumbnail.id}
                isSelectionMode={isSelectionMode}
                showCheckbox={showCheckbox}
              />

              <div
                className="relative aspect-[16/9] w-full bg-muted cursor-pointer"
                onClick={handleThumbnailClick}
                onDoubleClick={handleDoubleClick}
              >
                <ThumbnailImage
                  imageUrl={thumbnail.image_url}
                  alt={thumbnail.prompt}
                />
                
                {/* Big Heart Animation */}
                {showBigHeart && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="animate-ping">
                      <Heart className="h-16 w-16 text-red-500 fill-current" />
                    </div>
                  </div>
                )}

                {/* Mobile Actions */}
                <div className="absolute top-2 right-2 z-20">
                  <button
                    className="h-8 w-8 text-white/90 hover:text-white bg-black/20 backdrop-blur-sm rounded-full hover:bg-black/40 transition-opacity border-none shadow-none flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllActions(!showAllActions);
                    }}
                  >
                    {showAllActions ? "→" : "←"}
                  </button>
                </div>

                {/* Thumbnail Actions */}
                <ThumbnailActions
                  thumbnail={thumbnail}
                  onRegenerate={handleRegenerateClick}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onOpenFullscreen={() => setModalOpen(true)}
                  isRegenerating={isCurrentlyRegenerating}
                  isDownloading={downloadLoading}
                />

                {/* Thumbnail Reaction */}
                <ThumbnailReaction
                  thumbnailId={thumbnail.id}
                  hasReacted={hasReacted}
                  reactionCount={reactionCount}
                  onReaction={handleReaction}
                  isLoading={isReactionLoading}
                />

                {/* Thumbnail User Info */}
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <ThumbnailUserInfo
                    user={thumbnail.user}
                    created_at={thumbnail.created_at}
                    size="md"
                    showDate={true}
                  />
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
                <ThumbnailImage
                  imageUrl={thumbnail.image_url}
                  alt={thumbnail.prompt}
                />
              </div>
              <ThumbnailDetails
                thumbnail={thumbnail}
                copied={copied}
                regenLoading={isCurrentlyRegenerating}
                handleCopy={handleCopy}
                handleRegenerate={handleRegenerateClick}
                handleDownload={handleDownload}
                handleShare={handleShare}
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
              <ThumbnailSelection
                selected={selected}
                onSelect={onSelect || (() => {})}
                thumbnailId={thumbnail.id}
                isSelectionMode={isSelectionMode}
                showCheckbox={showCheckbox}
              />

              <div
                className="relative aspect-[16/9] w-full bg-muted cursor-pointer"
                onClick={handleThumbnailClick}
                onDoubleClick={handleDoubleClick}
              >
                <ThumbnailImage
                  imageUrl={thumbnail.image_url}
                  alt={thumbnail.prompt}
                />
                
                {/* Big Heart Animation */}
                {showBigHeart && (
                  <div className="absolute inset-0 flex items-center justify-center z-30">
                    <div className="animate-ping">
                      <Heart className="h-16 w-16 text-red-500 fill-current" />
                    </div>
                  </div>
                )}

                {/* Desktop Actions */}
                <ThumbnailActions
                  thumbnail={thumbnail}
                  onRegenerate={handleRegenerateClick}
                  onDownload={handleDownload}
                  onShare={handleShare}
                  onOpenFullscreen={() => setModalOpen(true)}
                  isRegenerating={isCurrentlyRegenerating}
                  isDownloading={downloadLoading}
                />

                {/* Thumbnail Reaction */}
                <ThumbnailReaction
                  thumbnailId={thumbnail.id}
                  hasReacted={hasReacted}
                  reactionCount={reactionCount}
                  onReaction={handleReaction}
                  isLoading={isReactionLoading}
                />
                
                {/* Thumbnail User Info */}
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
                  <ThumbnailUserInfo
                    user={thumbnail.user}
                    created_at={thumbnail.created_at}
                    size="md"
                    showDate={true}
                  />
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
              <ThumbnailImage
                imageUrl={thumbnail.image_url}
                alt={thumbnail.prompt}
              />
            </div>
            <ThumbnailDetails
              thumbnail={thumbnail}
              copied={copied}
              regenLoading={isCurrentlyRegenerating}
              handleCopy={handleCopy}
              handleRegenerate={handleRegenerate}
              handleDownload={handleDownload}
              handleShare={handleShare}
              onCloseModal={() => setModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogTitle>Confirm Regeneration</DialogTitle>
            <DialogDescription>
              Are you sure you want to regenerate this thumbnail? This action will take 4 credits.
            </DialogDescription>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowConfirm(false)}>Cancel</button>
              <button onClick={handleConfirmRegenerate} disabled={isCurrentlyRegenerating}>
                {isCurrentlyRegenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 