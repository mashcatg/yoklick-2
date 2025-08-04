import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ThumbnailImageProps } from '@/app/types/thumbnail';

export const ThumbnailImage = ({ 
  imageUrl, 
  alt, 
  onLoad, 
  onError, 
  className 
}: ThumbnailImageProps) => {
  const [loaded, setLoaded] = useState(false);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setLoaded(true);
    onError?.();
  };

  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 w-full h-full" />}
      <img
        src={imageUrl}
        alt={alt}
        className={cn(
          "object-cover w-full h-full transition-all duration-700",
          loaded ? "blur-0" : "blur-md"
        )}
        onLoad={handleLoad}
        onError={handleError}
        style={{ display: loaded ? "block" : "none" }}
      />
    </>
  );
}; 