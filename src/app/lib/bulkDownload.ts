export const bulkDownloadImages = async (thumbnails: any[], onProgress?: (downloaded: number, total: number) => void) => {
  if (thumbnails.length === 0) return 0;

  let downloadedCount = 0;
  const totalCount = thumbnails.length;

  console.log(`Starting bulk download of ${totalCount} thumbnails`);

  try {
    // Download each thumbnail one by one with proper delays
    for (let i = 0; i < thumbnails.length; i++) {
      const thumb = thumbnails[i];
      
      try {
        console.log(`Downloading ${i + 1}/${totalCount}: ${thumb.id}`);
        
        // Create a unique filename
        const safePrompt = thumb.prompt?.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30) || 'thumbnail';
        const filename = `thumbnail-${thumb.id}-${safePrompt}.jpg`;
        
        // Method 1: Try direct fetch first
        let success = false;
        
        try {
          const response = await fetch(thumb.image_url, {
            method: 'GET',
            mode: 'cors',
            headers: {
              'Accept': 'image/*',
              'Cache-Control': 'no-cache'
            },
            // Add timeout
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          
          // Verify it's actually an image
          if (!blob.type.startsWith('image/')) {
            throw new Error('Response is not an image');
          }
          
          const url = window.URL.createObjectURL(blob);
          
          // Create download link
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          
          // Add to DOM and trigger download
          document.body.appendChild(link);
          link.click();
          
          // Clean up immediately
          try {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Cleanup error:', e);
          }
          
          success = true;
          downloadedCount++;
          console.log(`✓ Downloaded ${thumb.id} (${downloadedCount}/${totalCount})`);
          
        } catch (fetchError) {
          console.error(`Fetch failed for ${thumb.id}:`, fetchError);
          
          // Method 2: Try opening in new tab as fallback
          try {
            console.log(`Trying fallback method for ${thumb.id}`);
            
            // Create a temporary link to open in new tab
            const link = document.createElement('a');
            link.href = thumb.image_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Give user time to save manually
            await new Promise(resolve => setTimeout(resolve, 500));
            
            success = true;
            downloadedCount++;
            console.log(`✓ Opened ${thumb.id} in new tab (${downloadedCount}/${totalCount})`);
            
          } catch (fallbackError) {
            console.error(`Fallback also failed for ${thumb.id}:`, fallbackError);
          }
        }
        
        // Update progress
        if (onProgress) {
          onProgress(downloadedCount, totalCount);
        }

        // Wait between downloads to prevent browser blocking
        if (i < thumbnails.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Increased delay
        }

      } catch (error) {
        console.error(`Error downloading ${thumb.id}:`, error);
        // Continue with next thumbnail instead of failing completely
      }
    }
    
    console.log(`Bulk download completed: ${downloadedCount}/${totalCount} thumbnails downloaded`);
    return downloadedCount;
    
  } catch (error) {
    console.error('Bulk download error:', error);
    return downloadedCount; // Return what we managed to download
  }
}; 