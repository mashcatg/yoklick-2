"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Eye, 
  EyeOff, 
  Star, 
  StarOff, 
  CheckCircle, 
  Clock,
  Search,
  User,
  MessageSquare,
  Filter,
  RefreshCw,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/ui/data-table";

interface FeedbackItem {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  is_reviewed?: boolean;
  is_featured?: boolean;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  user?: {
    name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
}

const ADMIN_EMAILS = [
  "mashrafaiman3025@gmail.com",
  "mashrafaiman2025@gmail.com", 
  "mashrafaiman2@gmail.com"
];

export default function AdminFeedbackPage() {
  const [user, setUser] = useState<any>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          router.push("/auth/signin");
          return;
        }

        // Check if user is admin
        if (!ADMIN_EMAILS.includes(user.email || "")) {
          toast.error("Access denied. Admin privileges required.");
          router.push("/");
          return;
        }

        setUser(user);
        await fetchFeedback();
      } catch (error) {
        console.error("Error fetching user:", error);
        toast.error("Failed to load admin panel");
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/admin/feedback');
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Feedback API error:', errorData);
        throw new Error(`Failed to fetch feedback: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      setFeedback(data.feedback || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  // Optimistic update function for feedback
  const updateFeedbackOptimistically = (feedbackId: string, updates: Partial<FeedbackItem>) => {
    setFeedback(prev => prev.map(item => 
      item.id === feedbackId ? { ...item, ...updates } : item
    ));
  };

  const handleToggleReviewed = async (feedbackId: string, currentReviewed: boolean) => {
    try {
      // Optimistic update
      const newReviewedState = !currentReviewed;
      updateFeedbackOptimistically(feedbackId, {
        is_reviewed: newReviewedState,
        reviewed_by: newReviewedState ? user?.id : null,
        reviewed_at: newReviewedState ? new Date().toISOString() : null
      });

      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: feedbackId,
          updates: {
            is_reviewed: newReviewedState,
            reviewed_by: newReviewedState ? user?.id : null,
            reviewed_at: newReviewedState ? new Date().toISOString() : null
          }
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        updateFeedbackOptimistically(feedbackId, {
          is_reviewed: currentReviewed,
          reviewed_by: currentReviewed ? user?.id : null,
          reviewed_at: currentReviewed ? new Date().toISOString() : null
        });
        throw new Error('Failed to update feedback');
      }

      toast.success(newReviewedState ? "Marked as reviewed" : "Marked as unreviewed");
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast.error("Failed to update feedback");
    }
  };

  const handleToggleFeatured = async (feedbackId: string, currentFeatured: boolean) => {
    try {
      // Optimistic update
      const newFeaturedState = !currentFeatured;
      updateFeedbackOptimistically(feedbackId, {
        is_featured: newFeaturedState
      });

      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: feedbackId,
          updates: {
            is_featured: newFeaturedState
          }
        })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        updateFeedbackOptimistically(feedbackId, {
          is_featured: currentFeatured
        });
        throw new Error('Failed to update feedback');
      }

      toast.success(newFeaturedState ? "Featured" : "Unfeatured");
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast.error("Failed to update feedback");
    }
  };

  const exportFeedback = () => {
    const csvContent = [
      ['User', 'Message', 'Status', 'Featured', 'Date'],
      ...feedback.map(item => [
        item.user?.email || item.user?.name || 'Unknown',
        item.message,
        item.is_reviewed ? 'Reviewed' : 'Unreviewed',
        item.is_featured ? 'Yes' : 'No',
        new Date(item.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'feedback.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Feedback exported successfully');
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Feedback Management</h1>
          <p className="text-muted-foreground">Manage user feedback and reviews</p>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Feedback Management</h1>
            <p className="text-muted-foreground">Manage user feedback and reviews</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchFeedback} disabled={refreshing}>
              {refreshing ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button onClick={exportFeedback} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {feedback.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback found</p>
            </CardContent>
          </Card>
        ) : (
          feedback.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {item.user?.avatar_url ? (
                        <img
                          src={item.user.avatar_url}
                          alt={item.user.name || "User"}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                          {getInitials(item.user?.name || item.user?.email || "U")}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          {item.user?.name || item.user?.email || "Unknown User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.is_reviewed ? "default" : "secondary"}>
                      {item.is_reviewed ? "Reviewed" : "Unreviewed"}
                    </Badge>
                    {item.is_featured && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed">{item.message}</p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleReviewed(item.id, !!item.is_reviewed)}
                      className="flex items-center gap-2"
                    >
                      {item.is_reviewed ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Mark Unreviewed
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Mark Reviewed
                        </>
                      )}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleFeatured(item.id, !!item.is_featured)}
                      className="flex items-center gap-2"
                    >
                      {item.is_featured ? (
                        <>
                          <StarOff className="h-4 w-4" />
                          Unfeature
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4" />
                          Feature
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {item.is_reviewed && (
                    <div className="text-xs text-muted-foreground">
                      Reviewed by: {item.reviewed_by || "Unknown"} on {formatDate(item.reviewed_at || "")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 