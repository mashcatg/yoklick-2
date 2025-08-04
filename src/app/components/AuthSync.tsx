"use client";

import { useEffect } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function AuthSync() {
  useEffect(() => {
    // Set cookie on initial load
    const syncCookie = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/`;
      }
    };
    syncCookie();

    // Listen for auth state changes (login, logout, refresh)
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        document.cookie = `sb-access-token=${session.access_token}; path=/`;
      } else {
        // Remove cookie on logout
        document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    });

    return () => {
      if (data && data.subscription && typeof data.subscription.unsubscribe === 'function') {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  return null;
}