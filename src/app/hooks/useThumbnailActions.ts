import { useState } from 'react';
import { toast } from 'sonner';
import { Thumbnail } from '@/app/types/thumbnail';

export const useThumbnailActions = (thumbnail: Thumbnail) => {
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [isCurrentlyRegenerating, setIsCurrentlyRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(thumbnail.prompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying prompt:', error);
      toast.error("Failed to copy prompt");
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloadLoading(true);
      
      if (!thumbnail.image_url) {
        throw new Error("No image URL available");
      }
      
      const response = await fetch(thumbnail.image_url, {
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
      link.download = `thumbnail-${thumbnail.id}.jpg`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 100);
      
      toast.success("Thumbnail downloaded successfully!");
      
    } catch (error) {
      console.error('Error downloading thumbnail:', error);
      toast.error("Failed to download thumbnail. Please try right-clicking and 'Save image as'");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const shareUrl = `${window.location.origin}/view/${thumbnail.id}`;
      const shareText = `${thumbnail.prompt}\n\n${shareUrl}`;
      
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
    } catch (error) {
      console.error('Error sharing thumbnail:', error);
      toast.error("Failed to share thumbnail");
    }
  };

  const handleRegenerate = async () => {
    setIsCurrentlyRegenerating(true);
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: thumbnail.prompt,
          is_public: thumbnail.is_public || false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to regenerate");
      }

      toast.success("Thumbnail regenerated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Error regenerating thumbnail:", error);
      toast.error("Failed to regenerate thumbnail");
    } finally {
      setIsCurrentlyRegenerating(false);
    }
  };

  return {
    downloadLoading,
    isCurrentlyRegenerating,
    copied,
    handleCopy,
    handleDownload,
    handleShare,
    handleRegenerate
  };
}; 