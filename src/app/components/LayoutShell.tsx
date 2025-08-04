"use client";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import Bottombar from "./Bottombar";
import { subscribeToGlobalLoader } from "./GlobalLoader";
import { useEffect, useState } from "react";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [loaderActive, setLoaderActive] = useState(false);

  // Subscribe to global loader state
  useEffect(() => {
    const unsubscribe = subscribeToGlobalLoader(setLoaderActive);
    return unsubscribe;
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar */}
      <Topbar />

      {/* Content Area: Sidebar + Page Content */}
      <div className="flex flex-1">
        {/* Sidebar: fixed width, hidden on mobile */}
        <Sidebar className="hidden lg:flex" />

        {/* Main content: pushes right of sidebar, fills remaining space */}
        <div className={`flex flex-1 bg-[#cccccc1f] dark:bg-[#303030] pr-0 sm:pr-4 overflow-auto ${
          loaderActive ? 'ml-0' : ''
        }`}>
          <main className={`flex-1 p-4 rounded-3xl bg-white dark:bg-[#171717] pb-16 ${
            loaderActive ? 'ml-0' : 'ml-0 lg:ml-20'
          }`}>
            {children}
          </main>
        </div>
      </div>

      {/* Bottom bar for mobile */}
      <Bottombar className="lg:hidden" />
    </div>
  );
}
