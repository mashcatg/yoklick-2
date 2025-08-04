export async function bulkDownloadImages(thumbnails: any[]): Promise<number> {
  if (typeof window === 'undefined') {
    return 0; // Server-side rendering
  }

  const totalCount = thumbnails.length;
  let downloadedCount = 0;

  // Create a temporary container for downloads
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  document.body.appendChild(tempContainer);

  try {
    for (let i = 0; i < totalCount; i++) {
      const thumb = thumbnails[i];
      if (!thumb?.image_url) continue;

      try {
        // Fetch the image
        const response = await fetch(thumb.image_url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('Response is not an image');
        }

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thumbnail_${thumb.id || i}.jpg`;
        link.style.display = 'none';

        // Add to temporary container and trigger download
        tempContainer.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        downloadedCount++;
        
        // Small delay to prevent browser from blocking multiple downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (fetchError) {
        // Fallback: try to open in new tab
        try {
          const link = document.createElement('a');
          link.href = thumb.image_url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.style.display = 'none';

          tempContainer.appendChild(link);
          link.click();
          document.body.removeChild(link);

          downloadedCount++;
        } catch (fallbackError) {
          // Silent error handling for production
        }
      }
    }
  } catch (error) {
    // Silent error handling for production
  } finally {
    // Clean up temporary container
    try {
      document.body.removeChild(tempContainer);
    } catch (e) {
      // Silent cleanup error
    }
  }

  return downloadedCount;
} 