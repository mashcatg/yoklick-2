export interface User {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

export interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  user?: User;
  created_at?: string;
  user_id?: string;
  group_id?: string;
  is_hidden?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
  text_position?: string;
}

export interface ThumbnailCardProps {
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

export interface ThumbnailActionsProps {
  thumbnail: Thumbnail;
  onRegenerate: () => void;
  onDownload: () => void;
  onShare: () => void;
  onOpenFullscreen: () => void;
  isRegenerating?: boolean;
  isDownloading?: boolean;
}

export interface ThumbnailReactionProps {
  thumbnailId: string;
  hasReacted: boolean;
  reactionCount: number;
  onReaction: (e: React.MouseEvent) => void;
  isLoading?: boolean;
}

export interface ThumbnailUserInfoProps {
  user?: User;
  created_at?: string;
  size?: 'sm' | 'md' | 'lg';
  showDate?: boolean;
}

export interface ThumbnailImageProps {
  imageUrl: string;
  alt: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

export interface ThumbnailSelectionProps {
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  thumbnailId: string;
  isSelectionMode: boolean;
  showCheckbox: boolean;
}

export interface ThumbnailModalProps {
  thumbnail: Thumbnail;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onShare: () => void;
  isRegenerating?: boolean;
}

export interface ThumbnailDrawerProps {
  thumbnail: Thumbnail;
  isOpen: boolean;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onShare: () => void;
  isRegenerating?: boolean;
} 