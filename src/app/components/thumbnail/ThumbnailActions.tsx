import { Button } from '@/components/ui/button';
import { Download, Share, Maximize2, RefreshCw } from 'lucide-react';
import { ThumbnailActionsProps } from '@/app/types/thumbnail';

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

export const ThumbnailActions = ({
  thumbnail,
  onRegenerate,
  onDownload,
  onShare,
  onOpenFullscreen,
  isRegenerating = false,
  isDownloading = false
}: ThumbnailActionsProps) => {
  return (
    <div className="absolute top-2 right-2 z-20 flex gap-2 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200">
      <ActionIcon
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onRegenerate();
        }}
        title="Regenerate"
        disabled={isRegenerating}
      >
        <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
      </ActionIcon>
      
      <ActionIcon 
        onClick={onDownload} 
        title="Download" 
        disabled={isDownloading}
      >
        {isDownloading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </ActionIcon>
      
      <ActionIcon onClick={onShare} title="Share">
        <Share className="h-4 w-4" />
      </ActionIcon>
      
      <ActionIcon onClick={onOpenFullscreen} title="Open Fullscreen">
        <Maximize2 className="h-4 w-4" />
      </ActionIcon>
    </div>
  );
}; 