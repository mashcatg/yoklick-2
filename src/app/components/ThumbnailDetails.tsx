import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, Share, RefreshCw, Maximize2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Skeleton } from "@/components/ui/skeleton";
import { cleanPrompt } from "@/lib/promptUtils";
import { toast } from "sonner";
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from "@/app/lib/userUtils";

interface Thumbnail {
  id: string;
  image_url: string;
  prompt: string;
  text_position?: string;
  user?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  created_at?: string;
  user_id?: string;
  group_id?: string;
  is_hidden?: boolean;
  is_public?: boolean;
  is_featured?: boolean;
}

export default function ThumbnailDetails({
  thumbnail,
  copied,
  regenLoading,
  handleCopy,
  handleRegenerate,
  handleDownload,
  handleShare,
  onCloseModal,
}: {
  thumbnail: any;
  copied: boolean;
  regenLoading: boolean;
  handleCopy: () => void;
  handleRegenerate: () => void;
  handleDownload: () => void;
  handleShare: () => void;
  onCloseModal?: () => void;
}) {
  const router = useRouter();
  const [sameGenerationThumbnails, setSameGenerationThumbnails] = useState<Thumbnail[]>([]);
  const [loadingSameGen, setLoadingSameGen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchSameGeneration = async () => {
      if (!thumbnail?.group_id) return;
      
      setLoadingSameGen(true);
      try {
        const { data } = await supabase
          .from("thumbnails")
          .select("*, user:users_meta(id, name, avatar_url)")
          .eq("group_id", thumbnail.group_id)
          .neq("id", thumbnail.id) // Exclude the current thumbnail
          .order("created_at", { ascending: false })
          .limit(6);

        if (data) {
          setSameGenerationThumbnails(data);
        }
      } catch (error) {
        console.error("Error fetching same generation thumbnails:", error);
      } finally {
        setLoadingSameGen(false);
      }
    };

    fetchSameGeneration();
  }, [thumbnail?.id, thumbnail?.group_id]);

  const handleSameGenClick = (sameGenThumbnail: Thumbnail) => {
    // Close current modal and navigate to the new thumbnail
    if (onCloseModal) {
      onCloseModal();
    }
    // Use setTimeout to ensure modal closes before navigation
    setTimeout(() => {
      router.push(`/view/${sameGenThumbnail.id}`);
    }, 100);
  };

  return (
    <div className="p-4 flex flex-col gap-2">
      {/* User Info and Actions */}
      <div className="animate-element animate-delay-200 flex flex-col md:flex-row items-start md:items-center justify-start md:justify-between gap-4 text-xs text-muted-foreground mb-2">
        {/* User Info */}
        <Link href={`/thumbnails/${thumbnail.user?.id || thumbnail.user_id}`} className="flex items-center gap-3 p-0 transition-colors">
          {getUserAvatar(thumbnail.user) ? (
            <img
              src={getUserAvatar(thumbnail.user)!}
              alt={`${getUserDisplayName(thumbnail.user)}'s avatar`}
              className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border-2 border-primary/20">
              {getUserInitials(thumbnail.user)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-base font-semibold text-foreground">
              {getUserDisplayName(thumbnail.user)}
            </span>
            {thumbnail.created_at && (
              <span title={thumbnail.created_at} className="text-sm text-muted-foreground">
                Created {formatUserDate(thumbnail.created_at)}
              </span>
            )}
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-between md:justify-end text-foreground">

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleRegenerate}
            title="Regenerate"
          >
            <RefreshCw
              className={`h-4 w-4 ${regenLoading ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleShare}
            title="Share"
          >
            <Share className="h-4 w-4" />
          </Button>
          <Link href={thumbnail.id ? `/view/${thumbnail.id}` : "#"}>
            <Button type="button" size="icon" variant="ghost" title="Open Fullscreen">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Copied Feedback */}
      {copied && <span className="animate-element animate-delay-300 text-green-600 text-xs mt-1 text-right">Copied!</span>}
      
      {/* Prompt */}
      {/* <div className="animate-element animate-delay-300 text-base font-normal text-foreground break-words bg-muted p-3 rounded-md">
        {cleanPrompt(thumbnail.prompt)}
      </div> */}

      {/* Other images from the same generation */}
      {(sameGenerationThumbnails.length > 0 || loadingSameGen) && (
        <div className="animate-element animate-delay-400 mt-4">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Other Images from This Generation</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {loadingSameGen ? (
              // Show skeleton loading
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="aspect-[16/9] rounded-lg overflow-hidden">
                  <Skeleton className="w-full h-full" />
                </div>
              ))
            ) : (
              // Show actual images
              sameGenerationThumbnails.map((sameGen) => (
                <button
                  key={sameGen.id}
                  onClick={() => handleSameGenClick(sameGen)}
                  className="aspect-[16/9] rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img 
                    src={sameGen.image_url} 
                    alt={sameGen.prompt} 
                    className="object-cover w-full h-full"
                  />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
