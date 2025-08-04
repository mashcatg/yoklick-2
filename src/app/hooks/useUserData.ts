import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { ensureUserData, UserInfo } from "@/app/lib/userUtils";
import { userDataCache } from "@/app/lib/userDataCache";

export function useUserData(thumbnail: any) {
  const [enhancedThumbnail, setEnhancedThumbnail] = useState(thumbnail);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!thumbnail) return;
      
      // If user data is already complete, no need to fetch
      if (thumbnail.user && thumbnail.user.name && thumbnail.user.id) {
        setEnhancedThumbnail(thumbnail);
        return;
      }

      // If we have user_id but no user data, use cache
      if (thumbnail.user_id && (!thumbnail.user || !thumbnail.user.name)) {
        setLoading(true);
        try {
          const userData = await userDataCache.getUserData(thumbnail.user_id);
          if (userData) {
            setEnhancedThumbnail({
              ...thumbnail,
              user: {
                id: userData.id,
                name: userData.name,
                avatar_url: userData.avatar_url,
                email: userData.email
              }
            });
          } else {
            setEnhancedThumbnail(thumbnail);
          }
        } catch (error) {
          console.error("Error loading user data:", error);
          setEnhancedThumbnail(thumbnail);
        } finally {
          setLoading(false);
        }
      } else {
        setEnhancedThumbnail(thumbnail);
      }
    };

    loadUserData();
  }, [thumbnail]);

  return { thumbnail: enhancedThumbnail, loading };
}

export function useUserInfo(userId: string | null) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserInfo = async () => {
      if (!userId) {
        setUserInfo(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users_meta")
          .select("id, name, avatar_url, email")
          .eq("id", userId)
          .single();

        if (!error && data) {
          setUserInfo({
            id: data.id,
            name: data.name,
            avatar_url: data.avatar_url,
            email: data.email
          });
        } else {
          setUserInfo(null);
        }
      } catch (error) {
        console.error("Error loading user info:", error);
        setUserInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserInfo();
  }, [userId]);

  return { userInfo, loading };
} 