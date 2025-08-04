"use client";

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

// Create a global state for loader visibility
let globalLoaderActive = false;
const listeners: Array<(active: boolean) => void> = [];

export const setGlobalLoaderActive = (active: boolean) => {
  globalLoaderActive = active;
  listeners.forEach(listener => listener(active));
};

export const getGlobalLoaderActive = () => globalLoaderActive;

export const subscribeToGlobalLoader = (listener: (active: boolean) => void) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

export default function GlobalLoader() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Show loader for initial page load
    const timer = setTimeout(() => {
      setIsLoading(false);
      setGlobalLoaderActive(false);
    }, 2000);

    // Set global loader as active when component mounts
    setGlobalLoaderActive(true);

    return () => {
      clearTimeout(timer);
      setGlobalLoaderActive(false);
    };
  }, []);

  if (!mounted || !isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-[#171717]">
      <div className="flex flex-col items-center">
        <div className="relative">
          {/* Light mode logo */}
          <img
            src="/yoklick.png"
            alt="Yoklick"
            className={`h-10 w-15 animate-pulse transition-opacity ${
              theme === 'dark' ? 'opacity-0' : 'opacity-100'
            }`}
          />
          {/* Dark mode logo */}
          <img
            src="/yoklick-logo-dark-mode.png"
            alt="Yoklick"
            className={`absolute inset-0 h-10 w-15 animate-pulse transition-opacity ${
              theme === 'dark' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </div>
      </div>
    </div>
  );
} 