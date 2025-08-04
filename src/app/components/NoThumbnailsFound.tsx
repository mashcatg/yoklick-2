import { Button } from "@/components/ui/button";

export default function NoThumbnailsFound() {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No thumbnails yet</h3>
        <p className="text-muted-foreground mb-6">Create your first AI-generated YouTube thumbnail to get started!</p>
        <Button 
          onClick={() => {
            // Focus on the prompt box
            const promptBox = document.querySelector('textarea[placeholder="Write a few words..."]') as HTMLTextAreaElement;
            if (promptBox) {
              promptBox.focus();
            }
          }}
          className="rounded-full px-6 py-2 font-semibold"
        >
          Create Your First Thumbnail
        </Button>
      </div>
    </div>
  );
}
