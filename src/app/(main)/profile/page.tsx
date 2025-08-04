"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles,
  CreditCard, 
  LogOut,
  Eye, 
  EyeOff, 
  Zap,
  Gift,
  MessageSquare,
  Edit,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from "@/app/lib/userUtils";

interface UserStats {
  totalGenerations: number;
  publicGenerations: number;
  privateGenerations: number;
  credits: number;
  joinDate: string;
}

interface FeedbackItem {
  id: string;
  message: string;
  created_at: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [userMeta, setUserMeta] = useState<any>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
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
        
        // Fetch user metadata from database
        const { data: userMetaData } = await supabase
          .from("users_meta")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setUserMeta(userMetaData);
        setLoading(false);
        
        // Fetch user statistics and feedback
        await Promise.all([
          fetchUserStats(user.id),
          fetchFeedbackHistory()
        ]);
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load profile");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const fetchUserStats = async (userId: string) => {
    try {
      setStatsLoading(true);
      
      // Fetch user metadata for credits
      const { data: userMeta } = await supabase
        .from("users_meta")
        .select("credits, created_at")
        .eq("id", userId)
        .single();

      // Fetch thumbnail statistics
      const { data: thumbnails } = await supabase
        .from("thumbnails")
        .select("is_public, created_at")
        .eq("user_id", userId);

      const totalGenerations = thumbnails?.length || 0;
      const publicGenerations = thumbnails?.filter(t => t.is_public).length || 0;
      const privateGenerations = totalGenerations - publicGenerations;
      const credits = userMeta?.credits || 0;
      const joinDate = userMeta?.created_at || user?.created_at || new Date().toISOString();

      setUserStats({
        totalGenerations,
        publicGenerations,
        privateGenerations,
        credits,
        joinDate
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast.error("Failed to load statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchFeedbackHistory = async () => {
    try {
      setFeedbackLoading(true);
      
      const response = await fetch("/api/feedback");
      if (!response.ok) {
        throw new Error("Failed to fetch feedback");
      }
      
      const data = await response.json();
      setFeedbackHistory(data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback history:", error);
      // Don't show toast for feedback loading errors as it's not critical
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/auth/signin");
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleEditProfile = () => {
    router.push("/edit-profile");
  };

  const handleManageSubscription = () => {
    router.push("/subscription");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Create user info object for utility functions
  const getUserInfo = () => {
    if (!user) return null;
    return {
      id: user.id,
      name: userMeta?.name || user.user_metadata?.full_name || "",
      avatar_url: userMeta?.avatar_url || user.user_metadata?.avatar_url,
      email: user.email
    };
  };

  if (loading) {
    return (
      <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-8 py-8 pb-16">
        <div className="max-w-6xl lg:max-w-8xl mx-auto w-full">
          <Card className="p-4 md:p-8 shadow-none">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left side skeleton */}
              <div className="flex flex-col gap-6 lg:w-1/2">
                <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                  <Skeleton className="h-32 w-32 rounded-full" />
                  <div className="flex flex-col gap-1 items-center md:items-start">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              
              {/* Right side skeleton */}
              <div className="lg:w-1/2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-2 border rounded-lg flex items-center gap-4 h-16">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div className="flex flex-col flex-1">
                        <Skeleton className="h-6 w-16 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl px-2 mx-auto w-full flex flex-col gap-8 py-8 pb-16">
  
      {/* Main Profile Card with User Details and Statistics */}
      <div className="animate-element animate-delay-100 max-w-6xl lg:max-w-8xl mx-auto w-full">
        <Card className="p-4 md:p-8 shadow-none">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Side - User Profile */}
            <div className="animate-element animate-delay-200 flex flex-col gap-6 lg:w-1/2">
              {/* Profile Row: Image + Name/Email */}
              <div className="flex flex-col md:flex-row items-center gap-6 w-full">
                {/* Profile Picture */}
                <div className="relative">
                  {getUserAvatar(getUserInfo()) ? (
                    <img
                      src={getUserAvatar(getUserInfo())!}
                      alt="Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-primary/10 -lg"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border-4 border-primary/10 -lg">
                      <span className="text-4xl font-bold text-primary">
                        {getUserInitials(getUserInfo())}
                      </span>
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 rounded-full border-3 border-white shadow-sm"></div>
                </div>
                <div className="flex flex-col gap-1 items-center md:items-start">
                  {loading ? (
                    <>
                      <Skeleton className="h-8 w-32 mb-2" />
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-4 w-24" />
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold  flex items-center gap-2">
                        {getUserDisplayName(getUserInfo())}
                      </h2>
                      <p className="text-muted-foreground flex items-center gap-2">
                        {user?.email}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Active Now
                      </p>
                    </>
                  )}
                </div>
              </div>
                          {/* Action Buttons */}
            <div className="animate-element animate-delay-300 flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <Button 
                variant="outline" 
                onClick={handleEditProfile}
                className="flex items-center gap-2 flex-1"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push("/change-password")}
                className="flex items-center gap-2 flex-1"
              >
                <Lock className="h-4 w-4" />
                Change Password
              </Button>
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                className="flex items-center gap-2 flex-1"
              >
                <CreditCard className="h-4 w-4" />
                Subscription
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSignOut}
                className="flex items-center gap-2 flex-1"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
            </div>

            {/* Right Side - Statistics */}
            <div className="animate-element animate-delay-400 lg:w-1/2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credits */}
                <div className="p-2 border rounded-lg hover:-md transition- flex items-center gap-4 h-16">
                  <div className="p-3 rounded-md bg-primary/10 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-16 mb-1" />
                      ) : (
                        <div className="text-2xl font-bold text-primary mb-0.5">
                          {userStats?.credits || 0}
                        </div>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5">Available Credits</h3>
                    
                  </div>
                </div>

                {/* Total Generations */}
                <div className="p-2 border rounded-lg hover:-md transition- flex items-center gap-4 h-16">
                  <div className="p-3 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-16 mb-1" />
                      ) : (
                        <div className="text-2xl font-bold text-blue-500 mb-0.5">
                          {userStats?.totalGenerations || 0}
                        </div>
                      )}
                    
                    </div><h3 className="font-semibold text-sm mb-0.5">Generations</h3>
                    
                  </div>
                </div>
              
                {/* Public Generations */}
                <div className="p-2 border rounded-lg hover:-md transition- flex items-center gap-4 h-16">
                  <div className="p-3 rounded-md bg-green-500/10 flex items-center justify-center">
                    <Eye className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-16 mb-1" />
                      ) : (
                        <div className="text-2xl font-bold text-green-500 mb-0.5">
                          {userStats?.publicGenerations || 0}
                        </div>
                      )}
                      <Badge variant="secondary" className="text-xs w-fit">Public</Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5">Generations</h3>
                  </div>
                </div>

                {/* Private Generations */}
                <div className="p-2 border rounded-lg hover:-md transition- flex items-center gap-4 h-16">
                  <div className="p-3 rounded-md bg-gray-500/10 flex items-center justify-center">
                    <EyeOff className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      {statsLoading ? (
                        <Skeleton className="h-6 w-16 mb-1" />
                      ) : (
                        <div className="text-2xl font-bold text-gray-500 mb-0.5">
                          {userStats?.privateGenerations || 0}
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs w-fit">Private</Badge>
                    </div>
                    <h3 className="font-semibold text-sm mb-0.5">Generations</h3>
                  </div>
                </div>
              </div>
              
              {/* Visibility Label */}
              {/* <div className="text-center mt-4">
                <h3 className="font-semibold text-sm text-muted-foreground">Visibility</h3>
              </div> */}
              {/* <p className="text-xs text-muted-foreground">4 credits per generation</p> */}
            </div>
          </div>
        </Card>
      </div>
      <div className="animate-element animate-delay-500 flex flex-col md:flex-row justify-between gap-4">
      {/* Account Details */}
      <div className="max-w-3xl mx-auto w-full">
        <Card className="p-4 md:p-6 shadow-none">
          <div className="animate-element animate-delay-600 flex items-center gap-2 mb-6">
            
            <h3 className="text-lg font-semibold">Account Details</h3>
          </div>
          <div className="animate-element animate-delay-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Account Type</span>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {/* <Gift className="h-3 w-3 mr-1" />
                Free */}
                  {user?.user_metadata?.plan_type}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Email Verified</span>
              <Badge variant={user?.email_confirmed_at ? "default" : "destructive"} className="text-xs">
                {user?.email_confirmed_at ? "Verified" : "Unverified"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Last Active</span>
              <span className="text-sm font-medium">{formatDate(new Date().toISOString())}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm font-medium">{userStats ? formatDate(userStats.joinDate) : "..."}</span>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Feedback History */}
      <div className="max-w-3xl mx-auto w-full">
        <Card className="p-4 md:p-6 shadow-none">
          <div className="animate-element animate-delay-800 flex items-center gap-2 mb-6">
            
            <h3 className="text-lg font-semibold">Your Feedbacks</h3>
          </div>
          
          {feedbackLoading ? (
            <div className="animate-element animate-delay-900 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          ) : feedbackHistory.length > 0 ? (
            <div className="animate-element animate-delay-900 space-y-3">
              {feedbackHistory.map((feedback) => (
                <div key={feedback.id} className="p-4 border rounded-lg hover:-sm transition-">
                  <MessageSquare className="h-5 w-5 text-primary mb-2" />
                  <p className="text-sm text-foreground mb-2">{feedback.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(feedback.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="animate-element animate-delay-900 text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback submitted yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your feedback helps us improve the platform
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
    </div>
  );
} 