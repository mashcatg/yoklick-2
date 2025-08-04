"use client";
import Link from "next/link";
import { Home, Compass, Sparkles, LogOut, LogIn, CreditCard, Edit, Lock, User, Theater, Zap, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import FeedbackUI from "@/components/FeedbackDrawer";
import { subscribeToGlobalLoader } from "./GlobalLoader";

const nav = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/generations", label: "My Arts", Icon: Sparkles },
  { href: "/pricing", label: "Pricing", Icon: CreditCard }
];

export default function Bottombar({ className = "" }: { className?: string }) {
  const [user, setUser] = useState<any>(null);
  const [imageError, setImageError] = useState(false);
  const [loaderActive, setLoaderActive] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user);
    };
    getUser();
  }, []);

  // Subscribe to global loader state
  useEffect(() => {
    const unsubscribe = subscribeToGlobalLoader(setLoaderActive);
    return unsubscribe;
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDrawerOpen(false);
  };

  // Navigation handler that closes drawer before navigation
  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    setDrawerOpen(false);
    // Small delay to ensure drawer closes before navigation
    setTimeout(() => {
      router.push(href);
    }, 100);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase();
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const shouldShowDefaultAvatar = !user?.user_metadata?.avatar_url || imageError;

  // Helper to render nav item (icon + label) with consistent alignment
  const renderNavItem = (icon: React.ReactNode, label: string, isActive: boolean) => (
    <div
      className={`flex flex-col items-center gap-[2px] ${
        isActive ? "text-primary" : "text-muted-foreground"
      }`}
    >
      <div
        className={`p-1 hover:text-primary hover:bg-primary/10 rounded-[10px] ${
          isActive ? "text-primary bg-primary/10 rounded-[10px]" : ""
        } flex items-center justify-center`}
        style={{ minWidth: 32, minHeight: 32 }}
      >
        {icon}
      </div>
      <span className="text-[10px] leading-none">{label}</span>
    </div>
  );

  // Hide bottom bar when loader is active
  if (loaderActive) {
    return null;
  }

  return (
    <nav className={`fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-[#303030] z-50 flex justify-around items-center lg:hidden ${className}`}>
      {nav.map(({ href, label, Icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex justify-center"
            tabIndex={0}
          >
            {renderNavItem(<Icon size={22} strokeWidth={1.8} />, label, isActive)}
          </Link>
        );
      })}

      {user ? (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <div className="flex-1 flex justify-center">
              {renderNavItem(
                <div className="relative h-7 w-7 rounded-full overflow-hidden flex items-center justify-center">
                  {!shouldShowDefaultAvatar ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                      {getInitials(user.user_metadata.name || user.email || "U")}
                    </div>
                  )}
                </div>,
                "Profile",
                false
              )}
            </div>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-left">Account</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                  {!shouldShowDefaultAvatar ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="avatar"
                      className="h-full w-full object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {getInitials(user.user_metadata.name || user.email || "U")}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {user.user_metadata.name || "User"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Navigation Links */}
              <div className="space-y-2">
                <button
                  onClick={(e) => handleNavigation("/profile", e)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <User size={20} />
                  <span>Profile</span>
                </button>
                <button
                  onClick={(e) => handleNavigation("/liked", e)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <Heart size={20} />
                  <span>Liked Thumbnails</span>
                </button>
                
                <button
                  onClick={(e) => handleNavigation("/subscription", e)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <CreditCard size={20} />
                  <span>Subscription</span>
                </button>
                <button
                  onClick={(e) => handleNavigation("/edit-profile", e)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <Edit size={20} />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={(e) => handleNavigation("/change-password", e)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
                >
                  <Lock size={20} />
                  <span>Change Password</span>
                </button>
                
              </div>

              <Separator />

              {/* Feedback */}
              <div className="flex items-center gap-3 w-full">
                <FeedbackUI className="bg-primary/10 text-primary gap-3 p-3 rounded-lg hover:bg-muted/50 transition-color w-[65%] text-left" />
                <div className="flex items-center justify-center gap-2 dark:bg-primary text-white bg-primary rounded-md w-[35%] px-3 py-2.5">
            <Zap className="h-4 w-4" />
            <span className="text-[14px] leading-none text-md">
              {user.user_metadata.plan_type}
            </span>
          </div>
              </div>

              <Separator />

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors w-full text-left"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Link href="/auth/signin" className="flex-1 flex justify-center">
          {renderNavItem(<LogIn size={22} strokeWidth={1.8} />, "Sign In", false)}
        </Link>
      )}
    </nav>
  );
}
