"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Sparkles, User, MessageSquare, Heart } from "lucide-react";
import { useCredits } from "@/app/context/CreditsContext";
import { subscribeToGlobalLoader } from "./GlobalLoader";

const nav = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/explore", label: "Explore", Icon: Compass },
  { href: "/generations", label: "My Generations", Icon: Sparkles },
  { href: "/liked", label: "Liked", Icon: Heart },
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/admin", label: "Admin", Icon: User, adminOnly: true },
];

export default function Sidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { credits } = useCredits();
  const [user, setUser] = useState<any>(null);
  const [loaderActive, setLoaderActive] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Subscribe to global loader state
  useEffect(() => {
    const unsubscribe = subscribeToGlobalLoader(setLoaderActive);
    return unsubscribe;
  }, []);

  // Hide sidebar when loader is active
  if (loaderActive) {
    return null;
  }

  return (
    <aside className={`w-16 fixed min-h-[calc(100vh-4rem)] bg-muted/50 dark:bg-[#303030] mx-2 flex flex-col items-center py-4 z-50 ${className}`}>
      <div className="flex flex-col items-center gap-3">
        {nav.map(({ href, label, Icon, adminOnly }) => {
          // Hide admin link if user is not admin
          const ADMIN_EMAILS = [
            "mashrafaiman3025@gmail.com",
            "mashrafaiman2025@gmail.com", 
            "mashrafaiman2@gmail.com"
          ];
          if (adminOnly && (!user?.email || !ADMIN_EMAILS.includes(user.email))) {
            return null;
          }
          
          const active = pathname === href;
          return (
            <Link key={href} href={href} className="group flex flex-col items-center gap-1 px-3 py-1">
              <div className={`p-2 mb-0 ${
                active
                  ? "text-primary bg-primary/10 rounded-[10px]"
                  : "group-hover:text-primary group-hover:bg-primary/10 group-hover:rounded-[10px]"
              }`}>
                <Icon size={22} strokeWidth={1.8} className="transition-colors" />
              </div>
              <span className="text-[10px] text-muted-foreground leading-none text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-auto flex flex-col items-center gap-4 mb-2">
        {/* Credits Link */}
        <Link
          href="/subscription"
          className="group flex flex-col items-center gap-1 px-3 py-1 text-primary bg-primary/10 rounded-[10px]"
        >
          <div className="p-2 mb-2">
            <Zap size={22} strokeWidth={1.8} className="transition-colors" />
          </div>
          <p>{credits !== undefined ? credits : "..."}</p>
          <span className="text-[10px] text-muted-foreground leading-none text-center text-primary pb-2">
            Credits
          </span>
        </Link>
      </div>
    </aside>
  );
}
