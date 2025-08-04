import { supabase } from "./supabaseClient";

export interface UserInfo {
  id: string;
  name: string;
  avatar_url?: string;
  email?: string;
}

/**
 * Get user display name with fallback
 */
export function getUserDisplayName(user?: UserInfo | null): string {
  if (!user) return "Anonymous User";
  if (user.name && user.name.trim()) return user.name.trim();
  if (user.email) return user.email.split('@')[0];
  return "Anonymous User";
}

/**
 * Get user avatar with fallback
 */
export function getUserAvatar(user?: UserInfo | null): string | null {
  if (!user) return null;
  return user.avatar_url || null;
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(user?: UserInfo | null): string {
  if (!user) return "?";
  if (user.name && user.name.trim()) {
    const names = user.name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  }
  if (user.email) {
    return user.email[0].toUpperCase();
  }
  return "?";
}

/**
 * Format user creation date - only date, no time
 */
export function formatUserDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    return "Unknown date";
  }
}

/**
 * Ensure user data is properly loaded for thumbnails
 * Uses API endpoint with service role to bypass RLS for fetching user data
 */
export async function ensureUserData(thumbnail: any): Promise<any> {
  if (!thumbnail) return thumbnail;
  
  // If user data is already present and complete, return as is
  if (thumbnail.user && thumbnail.user.name && thumbnail.user.id) {
    return thumbnail;
  }
  
  // If we have user_id but no user data, fetch it using API endpoint
  if (thumbnail.user_id && (!thumbnail.user || !thumbnail.user.name)) {
    try {
      const response = await fetch("/api/users/get-user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds: [thumbnail.user_id] }),
      });

      if (response.ok) {
        const { users } = await response.json();
        if (users && users.length > 0) {
          const userData = users[0];
          return {
            ...thumbnail,
            user: {
              id: userData.id,
              name: userData.name,
              avatar_url: userData.avatar_url,
              email: userData.email
            }
          };
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }
  
  return thumbnail;
} 