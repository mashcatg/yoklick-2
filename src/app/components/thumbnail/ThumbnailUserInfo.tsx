import Link from 'next/link';
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from '@/app/lib/userUtils';
import { ThumbnailUserInfoProps } from '@/app/types/thumbnail';

export const ThumbnailUserInfo = ({
  user,
  created_at,
  size = 'md',
  showDate = true
}: ThumbnailUserInfoProps) => {
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  const avatarSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  if (!user) return null;

  return (
    <Link 
      href={`/thumbnails/${user.id}`} 
      className="flex flex-col items-start bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 hover:bg-black/60 transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className={cn("rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-xs font-medium text-primary", avatarSizes[size])}>
          {getUserAvatar(user) ? (
            <img 
              src={getUserAvatar(user)!} 
              alt={`${getUserDisplayName(user)}'s avatar`}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getUserInitials(user)
          )}
        </div>
        <div className="flex flex-col items-start">
          <span className={cn("font-medium text-white", sizeClasses[size])}>
            {getUserDisplayName(user)}
          </span>
          {showDate && created_at && (
            <span className={cn("text-white/70", size === "sm" ? "text-xs" : "text-xs")}>
              {formatUserDate(created_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

// Helper function for className concatenation
const cn = (...classes: (string | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
}; 