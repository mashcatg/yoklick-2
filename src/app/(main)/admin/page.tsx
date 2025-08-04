"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2, Star, Eye, EyeOff, Copy, Link, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [publicThumbs, setPublicThumbs] = useState<any[]>([]);
  const [privateThumbs, setPrivateThumbs] = useState<any[]>([]);
  const [featuredThumbs, setFeaturedThumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("public");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [thumbnailToDelete, setThumbnailToDelete] = useState<any>(null);
  const router = useRouter();

  // Admin access list
  const ADMIN_EMAILS = [
    "mashrafaiman3025@gmail.com",
    "mashrafaiman2025@gmail.com", 
    "mashrafaiman2@gmail.com"
  ];

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Fetch user session and check admin access
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          router.push("/auth/signin");
          return;
        }
        setUser(userData.user);

        // Check if user is admin
        if (!userData.user.email || !ADMIN_EMAILS.includes(userData.user.email)) {
          toast.error("Access denied. Admin privileges required.");
          router.push("/");
          return;
        }

        // Fetch thumbnails
        await fetchThumbnails();
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
      }
    };

    fetchUserData();
  }, [router]);

  // Fetch all thumbnails
  const fetchThumbnails = async () => {
    try {
      setLoading(true);

      // Fetch all thumbnails using backend API to bypass RLS
      const [publicResponse, privateResponse, featuredResponse] = await Promise.all([
        fetch('/api/admin/thumbnails?type=public'),
        fetch('/api/admin/thumbnails?type=private'),
        fetch('/api/admin/thumbnails?type=featured')
      ]);

      if (!publicResponse.ok || !privateResponse.ok || !featuredResponse.ok) {
        throw new Error('Failed to fetch thumbnails');
      }

      const [publicData, privateData, featuredData] = await Promise.all([
        publicResponse.json(),
        privateResponse.json(),
        featuredResponse.json()
      ]);

      setPublicThumbs(publicData.thumbnails || []);
      setPrivateThumbs(privateData.thumbnails || []);
      setFeaturedThumbs(featuredData.thumbnails || []);
    } catch (error) {
      console.error("Error fetching thumbnails:", error);
      toast.error("Failed to load thumbnails");
    } finally {
      setLoading(false);
    }
  };

  // Delete thumbnail
  const handleDeleteThumbnail = async (thumbnail: any) => {
    try {
      // Optimistic update - remove from all lists immediately
      setPublicThumbs(prev => prev.filter(t => t.id !== thumbnail.id));
      setPrivateThumbs(prev => prev.filter(t => t.id !== thumbnail.id));
      setFeaturedThumbs(prev => prev.filter(t => t.id !== thumbnail.id));

      const response = await fetch('/api/admin/thumbnails', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: thumbnail.id
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setPublicThumbs(prev => [...prev, thumbnail]);
        setPrivateThumbs(prev => [...prev, thumbnail]);
        if (thumbnail.is_featured) {
          setFeaturedThumbs(prev => [...prev, thumbnail]);
        }
        throw new Error('Failed to delete thumbnail');
      }

      toast.success("Thumbnail deleted successfully");
      setDeleteDialogOpen(false);
      setThumbnailToDelete(null);
    } catch (error) {
      console.error("Error deleting thumbnail:", error);
      toast.error("Failed to delete thumbnail");
    }
  };

  // Copy generation link
  const handleCopyLink = (thumbnail: any) => {
    const link = `${window.location.origin}/view/${thumbnail.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Generation link copied to clipboard!");
  };

  // Copy prompt
  const handleCopyPrompt = (thumbnail: any) => {
    navigator.clipboard.writeText(thumbnail.prompt);
    toast.success("Prompt copied to clipboard!");
  };

  // Toggle featured status
  const handleToggleFeatured = async (thumbnail: any) => {
    try {
      // Optimistic update
      const newFeaturedState = !thumbnail.is_featured;
      const updatedThumbnail = { ...thumbnail, is_featured: newFeaturedState };
      
      // Update local state immediately
      setPublicThumbs(prev => prev.map(t => t.id === thumbnail.id ? updatedThumbnail : t));
      setPrivateThumbs(prev => prev.map(t => t.id === thumbnail.id ? updatedThumbnail : t));
      setFeaturedThumbs(prev => {
        if (newFeaturedState) {
          return [updatedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
        } else {
          return prev.filter(t => t.id !== thumbnail.id);
        }
      });

      const response = await fetch('/api/admin/thumbnails', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: thumbnail.id,
          updates: { is_featured: newFeaturedState }
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        const revertedThumbnail = { ...thumbnail, is_featured: thumbnail.is_featured };
        setPublicThumbs(prev => prev.map(t => t.id === thumbnail.id ? revertedThumbnail : t));
        setPrivateThumbs(prev => prev.map(t => t.id === thumbnail.id ? revertedThumbnail : t));
        setFeaturedThumbs(prev => {
          if (thumbnail.is_featured) {
            return [revertedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
          } else {
            return prev.filter(t => t.id !== thumbnail.id);
          }
        });
        throw new Error('Failed to update thumbnail');
      }

      toast.success(`Thumbnail ${newFeaturedState ? 'featured' : 'unfeatured'} successfully`);
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    }
  };

  // Toggle public/private status
  const handleTogglePublic = async (thumbnail: any) => {
    try {
      // Optimistic update
      const newPublicState = !thumbnail.is_public;
      const updatedThumbnail = { ...thumbnail, is_public: newPublicState };
      
      // Update local state immediately
      setPublicThumbs(prev => {
        if (newPublicState) {
          return [updatedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
        } else {
          return prev.filter(t => t.id !== thumbnail.id);
        }
      });
      setPrivateThumbs(prev => {
        if (!newPublicState) {
          return [updatedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
        } else {
          return prev.filter(t => t.id !== thumbnail.id);
        }
      });

      const response = await fetch('/api/admin/thumbnails', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: thumbnail.id,
          updates: { is_public: newPublicState }
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        const revertedThumbnail = { ...thumbnail, is_public: thumbnail.is_public };
        setPublicThumbs(prev => {
          if (thumbnail.is_public) {
            return [revertedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
          } else {
            return prev.filter(t => t.id !== thumbnail.id);
          }
        });
        setPrivateThumbs(prev => {
          if (!thumbnail.is_public) {
            return [revertedThumbnail, ...prev.filter(t => t.id !== thumbnail.id)];
          } else {
            return prev.filter(t => t.id !== thumbnail.id);
          }
        });
        throw new Error('Failed to update thumbnail');
      }

      toast.success(`Thumbnail ${newPublicState ? 'made public' : 'made private'} successfully`);
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    }
  };

  // Toggle hidden status
  const handleToggleHidden = async (thumbnail: any) => {
    try {
      // Optimistic update
      const newHiddenState = !thumbnail.is_hidden;
      const updatedThumbnail = { ...thumbnail, is_hidden: newHiddenState };
      
      // Update local state immediately
      setPublicThumbs(prev => prev.map(t => t.id === thumbnail.id ? updatedThumbnail : t));
      setPrivateThumbs(prev => prev.map(t => t.id === thumbnail.id ? updatedThumbnail : t));
      setFeaturedThumbs(prev => prev.map(t => t.id === thumbnail.id ? updatedThumbnail : t));

      const response = await fetch('/api/admin/thumbnails', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: thumbnail.id,
          updates: { is_hidden: newHiddenState }
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        const revertedThumbnail = { ...thumbnail, is_hidden: thumbnail.is_hidden };
        setPublicThumbs(prev => prev.map(t => t.id === thumbnail.id ? revertedThumbnail : t));
        setPrivateThumbs(prev => prev.map(t => t.id === thumbnail.id ? revertedThumbnail : t));
        setFeaturedThumbs(prev => prev.map(t => t.id === thumbnail.id ? revertedThumbnail : t));
        throw new Error('Failed to update thumbnail');
      }

      toast.success(`Thumbnail ${newHiddenState ? 'hidden' : 'unhidden'} from explore page successfully`);
    } catch (error) {
      console.error("Error updating thumbnail:", error);
      toast.error("Failed to update thumbnail");
    }
  };

  // Filter thumbnails based on search
  const filteredPublicThumbs = publicThumbs.filter(thumb =>
    thumb.prompt?.toLowerCase().includes(search.toLowerCase()) ||
    thumb.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPrivateThumbs = privateThumbs.filter(thumb =>
    thumb.prompt?.toLowerCase().includes(search.toLowerCase()) ||
    thumb.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFeaturedThumbs = featuredThumbs.filter(thumb =>
    thumb.prompt?.toLowerCase().includes(search.toLowerCase()) ||
    thumb.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage all thumbnails and user content</p>
      </div>

      {/* Search */}
      <div className="flex justify-center mb-6">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search thumbnails by prompt or user..."
          className="max-w-md"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{publicThumbs.length}</div>
            <div className="text-sm text-muted-foreground">Public Thumbnails</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{privateThumbs.length}</div>
            <div className="text-sm text-muted-foreground">Private Thumbnails</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{featuredThumbs.length}</div>
            <div className="text-sm text-muted-foreground">Featured Thumbnails</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{publicThumbs.length + privateThumbs.length}</div>
            <div className="text-sm text-muted-foreground">Total Thumbnails</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">Public ({filteredPublicThumbs.length})</TabsTrigger>
          <TabsTrigger value="private">Private ({filteredPrivateThumbs.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured ({filteredFeaturedThumbs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="public" className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading public thumbnails...</p>
            </div>
          ) : filteredPublicThumbs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No public thumbnails found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublicThumbs.map((thumbnail) => (
                <Card key={thumbnail.id} className="overflow-hidden">
                  <div className="aspect-[16/9] relative">
                    <img
                      src={thumbnail.image_url}
                      alt={thumbnail.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyPrompt(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Prompt"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyLink(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Link"
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleToggleFeatured(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_featured ? "Unfeature" : "Feature"}
                      >
                        <Star className={`h-3 w-3 ${thumbnail.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleTogglePublic(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_public ? "Make Private" : "Make Public"}
                      >
                        <EyeOff className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant={thumbnail.is_hidden ? "destructive" : "secondary"}
                        onClick={() => handleToggleHidden(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_hidden ? "Unhide from Explore" : "Hide from Explore"}
                      >
                        {thumbnail.is_hidden ? <Check className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setThumbnailToDelete(thumbnail);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {thumbnail.is_hidden && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">
                          Hidden
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {thumbnail.user?.avatar_url ? (
                        <img
                          src={thumbnail.user.avatar_url}
                          alt="avatar"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {thumbnail.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{thumbnail.user?.name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(thumbnail.created_at).toLocaleDateString()}</p>
                      </div>
                      {thumbnail.is_featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{thumbnail.prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="private" className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading private thumbnails...</p>
            </div>
          ) : filteredPrivateThumbs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No private thumbnails found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPrivateThumbs.map((thumbnail) => (
                <Card key={thumbnail.id} className="overflow-hidden">
                  <div className="aspect-[16/9] relative">
                    <img
                      src={thumbnail.image_url}
                      alt={thumbnail.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyPrompt(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Prompt"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyLink(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Link"
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleToggleFeatured(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_featured ? "Unfeature" : "Feature"}
                      >
                        <Star className={`h-3 w-3 ${thumbnail.is_featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleTogglePublic(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_public ? "Make Private" : "Make Public"}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant={thumbnail.is_hidden ? "destructive" : "secondary"}
                        onClick={() => handleToggleHidden(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_hidden ? "Unhide from Explore" : "Hide from Explore"}
                      >
                        {thumbnail.is_hidden ? <Check className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setThumbnailToDelete(thumbnail);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {thumbnail.is_hidden && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">
                          Hidden
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {thumbnail.user?.avatar_url ? (
                        <img
                          src={thumbnail.user.avatar_url}
                          alt="avatar"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {thumbnail.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{thumbnail.user?.name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(thumbnail.created_at).toLocaleDateString()}</p>
                      </div>
                      {thumbnail.is_featured && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{thumbnail.prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="mt-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading featured thumbnails...</p>
            </div>
          ) : filteredFeaturedThumbs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No featured thumbnails found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeaturedThumbs.map((thumbnail) => (
                <Card key={thumbnail.id} className="overflow-hidden">
                  <div className="aspect-[16/9] relative">
                    <img
                      src={thumbnail.image_url}
                      alt={thumbnail.prompt}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyPrompt(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Prompt"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleCopyLink(thumbnail)}
                        className="h-7 w-7"
                        title="Copy Link"
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleToggleFeatured(thumbnail)}
                        className="h-7 w-7"
                        title="Unfeature"
                      >
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => handleTogglePublic(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_public ? "Make Private" : "Make Public"}
                      >
                        {thumbnail.is_public ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant={thumbnail.is_hidden ? "destructive" : "secondary"}
                        onClick={() => handleToggleHidden(thumbnail)}
                        className="h-7 w-7"
                        title={thumbnail.is_hidden ? "Unhide from Explore" : "Hide from Explore"}
                      >
                        {thumbnail.is_hidden ? <Check className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setThumbnailToDelete(thumbnail);
                          setDeleteDialogOpen(true);
                        }}
                        className="h-7 w-7"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {thumbnail.is_hidden && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">
                          Hidden
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {thumbnail.user?.avatar_url ? (
                        <img
                          src={thumbnail.user.avatar_url}
                          alt="avatar"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {thumbnail.user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{thumbnail.user?.name || 'Unknown User'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(thumbnail.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                        Featured
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{thumbnail.prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Thumbnail</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this thumbnail? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => thumbnailToDelete && handleDeleteThumbnail(thumbnailToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 