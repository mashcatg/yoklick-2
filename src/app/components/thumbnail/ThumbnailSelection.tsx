import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThumbnailSelectionProps } from '@/app/types/thumbnail';

export const ThumbnailSelection = ({
  selected,
  onSelect,
  thumbnailId,
  isSelectionMode,
  showCheckbox
}: ThumbnailSelectionProps) => {
  if (!showCheckbox && !isSelectionMode) return null;

  return (
    <div className="absolute top-2 left-2 z-30">
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-8 w-8 backdrop-blur-sm border-none shadow-none rounded-full transition-all duration-200 hover:text-white",
          selected 
            ? "bg-primary text-white hover:bg-primary/80" 
            : "bg-black/20 text-white hover:bg-black/30"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(thumbnailId, !selected);
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
}; 