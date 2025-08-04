"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, User, Camera } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from "@/app/lib/userUtils";

export default function EditProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push("/auth/signin");
          return;
        }
        setUser(user);
        
        const displayName = getUserDisplayName({
          id: user.id,
          name: user.user_metadata?.full_name || "",
          avatar_url: user.user_metadata?.avatar_url,
          email: user.email
        });
        
        setFullName(displayName);
        setAvatarUrl(user.user_metadata?.avatar_url || "");
        setLoading(false);
      } catch (error) {
        toast.error("Failed to load profile");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload using API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/upload-profile-image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      setAvatarUrl(result.publicUrl);
      toast.success("Image uploaded. Please save changes to update your profile.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
      setPreviewUrl("");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);

      // Update user metadata in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: avatarUrl
        }
      });

      if (authError) {
        throw authError;
      }

      const { error: metaError } = await supabase
        .from("users_meta")
        .update({
          name: fullName.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id);

      if (metaError) {
      }

      toast.success("Profile updated successfully");
      router.push("/profile");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return getUserInitials({
      id: user?.id || "",
      name: name,
      email: user?.email || ""
    });
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-8 py-8">
        <div className="max-w-md mx-auto w-full">
          <Card className="p-6">
            <div className="space-y-6">
              <Skeleton className="h-8 w-32" />
              <div className="space-y-4">
                <Skeleton className="h-32 w-32 rounded-full mx-auto" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/profile" className="flex items-center gap-2 ">
          <Button size="icon" className="bg-primary/10 rounded-full p-2 hover:bg-primary/20 text-primary">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl md:text-3xl font-bold tracking-tight leading-tight flex-1">
          Edit Profile
        </h1>
      </div>

      {/* Edit Form */}
      <div className="max-w-md mx-auto w-full">
        <Card className="p-6">
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="relative">
                  {(previewUrl || avatarUrl) ? (
                    <img
                      src={previewUrl || avatarUrl}
                      alt="Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-primary/10 shadow-lg"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-primary/10 shadow-lg">
                      <span className="text-4xl font-bold text-primary">
                        {getInitials(fullName || user?.email || "U")}
                      </span>
                    </div>
                  )}
                  
                  {/* Upload Button Overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(file);
                  }
                }}
                className="hidden"
              />
              
              <div className="text-sm text-muted-foreground">
                Click the camera icon to upload a new photo
              </div>
            </div>

            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full"
              />
            </div>

            {/* Email Display (Read-only) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => router.push("/profile")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 