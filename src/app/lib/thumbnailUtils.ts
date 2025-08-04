import { User } from '@/app/types/thumbnail';

// Helper function to format date as "12 May, 2025"
export const formatGenerationDate = (dateString: string): string => {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  return `${day} ${month}, ${year}`;
};

// Helper function to get user display name with email fallback
export const getUserDisplayNameWithFallback = (user: User | null | undefined): string => {
  if (!user) return "Anonymous User";
  
  // If user has a name, use it
  if (user.name && user.name.trim()) {
    return user.name;
  }
  
  // If user has an email, use the part before @
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    return emailPart;
  }
  
  return "Anonymous User";
};

// Helper function to generate unique keys for thumbnails
export const generateThumbnailKey = (thumbnail: any, index: number): string => {
  if (!thumbnail) return `skeleton-${index}`;
  return `thumb-${thumbnail.id}-${index}`;
};

// Helper function to check if thumbnail is loading (null)
export const isThumbnailLoading = (thumbnail: any): boolean => {
  return thumbnail === null;
};

// Helper function to get thumbnail dimensions
export const getThumbnailDimensions = (aspectRatio: string = '16/9') => {
  const [width, height] = aspectRatio.split('/').map(Number);
  return { width, height };
};

// Helper function to validate thumbnail data
export const validateThumbnail = (thumbnail: any): boolean => {
  return thumbnail && 
         thumbnail.id && 
         thumbnail.image_url && 
         thumbnail.prompt;
};

// Helper function to clean thumbnail prompt
export const cleanThumbnailPrompt = (prompt: string): string => {
  if (!prompt) return '';
  
  // Remove excessive whitespace
  let cleaned = prompt.replace(/\s+/g, ' ').trim();
  
  // Limit length for display
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }
  
  return cleaned;
};

// Helper function to get thumbnail status
export const getThumbnailStatus = (thumbnail: any): 'loading' | 'error' | 'loaded' => {
  if (!thumbnail) return 'loading';
  if (!thumbnail.image_url) return 'error';
  return 'loaded';
}; 