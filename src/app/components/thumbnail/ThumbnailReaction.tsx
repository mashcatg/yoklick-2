import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThumbnailReactionProps } from '@/app/types/thumbnail';

export const ThumbnailReaction = ({
  thumbnailId,
  hasReacted,
  reactionCount,
  onReaction,
  isLoading = false
}: ThumbnailReactionProps) => {
  return (
    <div className="absolute bottom-2 right-2 z-20" onClick={(e) => e.stopPropagation()} data-love-button>
      <Button
        size="icon"
        variant="ghost"
        disabled={isLoading}
        className={cn(
          "h-8 w-8 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200",
          hasReacted 
            ? "text-red-500/80 hover:text-red-600/80 bg-white" 
            : "bg-black/20 hover:bg-black/30 text-white hover:text-white",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        onClick={onReaction}
      >
        <Heart className={cn(
          "h-4 w-4", 
          hasReacted ? "fill-current" : "",
          isLoading && "animate-pulse"
        )} />
      </Button>
      {hasReacted && reactionCount > 0 && (
        <div 
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors z-10"
          onClick={onReaction}
        >
          {reactionCount > 99 ? '99+' : reactionCount}
        </div>
      )}
    </div>
  );
}; 