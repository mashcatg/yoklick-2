"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LogIn, Zap, Edit, Lock, User, CreditCard, Heart } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import { logoutUser } from "@/app/lib/userCache";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import FeedbackUI from "@/components/FeedbackDrawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredits } from "../context/CreditsContext";
import { subscribeToGlobalLoader } from "./GlobalLoader";
import { getUserDisplayName, getUserAvatar, getUserInitials, formatUserDate } from "@/app/lib/userUtils";

const getInitials = (name: string) => {
  return getUserInitials({
    id: "",
    name: name,
    email: ""
  });
};

export default function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loaderActive, setLoaderActive] = useState(false);
  const { credits } = useCredits();
  
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user);
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  // Subscribe to global loader state
  useEffect(() => {
    const unsubscribe = subscribeToGlobalLoader(setLoaderActive);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const logout = async () => {
    try {
      await logoutUser();
      location.reload();
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback to direct signOut if the safe method fails
      await supabase.auth.signOut();
      location.reload();
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const shouldShowDefaultAvatar = !user?.user_metadata?.avatar_url || imageError;

  // Hide topbar when loader is active
  if (loaderActive) {
    return null;
  }

  return (
    <header className={`sticky top-0 z-40 w-full h-16 px-4 pr-5 flex items-center justify-between transition-all duration-300 ${
      isScrolled 
        ? 'bg-muted/50 dark:bg-[#303030]/80 backdrop-blur-md border-b border-border/50 shadow-sm' 
        : 'bg-[#cccccc1f] dark:bg-[#303030]'
    }`}>
      <Link href="/" className="px-0 py-0 md:px-3.5 md:py-1 flex items-center" aria-label="Go to homepage">
        <img
          src="/yoklick.png"
          alt="Yoklick-logo"
          className="h-[1.5rem] w-[7rem] hidden md:block dark:hidden"
        />
        <img
          src="/yoklick-logo-dark-mode.png"
          alt="Yoklick-logo-dark"
          className="h-[1.5rem] w-[7rem] hidden md:dark:block"
        />
        <img
          src="/yoklick-favicon-2.png"
          alt="Yoklick-logo"
          className="h-[2.5rem] w-[2.5rem] block md:hidden"
        />
      </Link>
      <nav className="flex gap-2.5 items-center">
        <ThemeToggle />
        <FeedbackUI className="hover:text-primary hover:bg-primary/10 hidden md:block" />
        <Link href="/pricing">
          <Button variant="ghost" className="text-sm font-medium hover:text-primary hover:bg-primary/10 transition-colors hidden md:block">
            Pricing
          </Button>
        </Link>
        <Link href="/subscription">
          <div className="flex items-center gap-1 dark:bg-primary/20 text-primary bg-primary/10 rounded-full px-3 py-2 block md:hidden">
            <Zap className="h-4 w-4" />
            <span className="text-[10px] leading-none text-md">
              {credits !== undefined ? credits : "..."}
            </span>
          </div>
        </Link>
        {loading ? (
          <Skeleton className="h-8 w-8 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="relative h-8 w-8 rounded-full cursor-pointer hidden md:block overflow-hidden">
                {!shouldShowDefaultAvatar ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="avatar"
                    className="h-full w-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/30 text-primary rounded-full">
                    <span className="text-sm font-medium">
                      {getInitials(user?.user_metadata?.full_name || user?.email || "")}
                    </span>
                  </div>
                )}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 mb-4" align="start">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/liked" className="flex items-center">
                    <Heart className="mr-2 h-4 w-4" />
                    Liked Thumbnails
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/subscription" className="flex items-center">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscription
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/edit-profile" className="flex items-center">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/change-password" className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </Link>
                </DropdownMenuItem>
                
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                Log out
                <LogOut className="ml-auto h-4 w-4" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
          <Button
            onClick={()=>router.replace(`/auth/signin?redirectTo=${typeof window !== 'undefined' ? window.location.pathname : '/'}`)}
            variant="default"
            size="sm"
            className="group gap-1 px-3 py-1 rounded-md"
          >
            Login Now <LogIn className="h-4 w-4 ml-2 hidden md:block" />
            
          </Button>
        </>          
        )}
      </nav>
    </header>
  );
}
