import React from "react";
import { UserInfo, getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from "@/app/lib/userUtils";

/**
 * Create a user avatar component with fallback
 */
export function UserAvatar({ user, size = "md", className = "" }: {
  user?: UserInfo | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-lg"
  };
  
  const avatarUrl = getUserAvatar(user);
  const initials = getUserInitials(user);
  
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${getUserDisplayName(user)}'s avatar`}
        className={`rounded-full object-cover border-2 border-primary/20 ${sizeClasses[size]} ${className}`}
      />
    );
  }
  
  return (
    <div className={`rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border-2 border-primary/20 ${sizeClasses[size]} ${className}`}>
      {initials}
    </div>
  );
}

/**
 * Create a user info component
 */
export function UserInfoComponent({ user, showDate = false, dateString, size = "md", className = "" }: {
  user?: UserInfo | null;
  showDate?: boolean;
  dateString?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <UserAvatar user={user} size={size} />
      <div className="flex flex-col">
        <span className={`font-semibold text-foreground ${sizeClasses[size]}`}>
          {getUserDisplayName(user)}
        </span>
        {showDate && dateString && (
          <span className={`text-muted-foreground ${size === "sm" ? "text-xs" : "text-sm"}`}>
            {formatUserDate(dateString)}
          </span>
        )}
      </div>
    </div>
  );
} 