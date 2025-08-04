"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GenerationContextType {
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  showHomepageSkeleton: boolean;
  setShowHomepageSkeleton: (show: boolean) => void;
  startGeneration: () => void;
  stopGeneration: () => void;
  forceHomepageSkeleton: () => void;
  clearHomepageSkeleton: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHomepageSkeleton, setShowHomepageSkeleton] = useState(false);

  const startGeneration = useCallback(() => {
    console.log('🚀 Starting generation - showing skeleton');
    setIsGenerating(true);
    setShowHomepageSkeleton(true);
  }, []);

  const stopGeneration = useCallback(() => {
    console.log('✅ Stopping generation - hiding skeleton');
    setIsGenerating(false);
    setShowHomepageSkeleton(false);
  }, []);

  const forceHomepageSkeleton = useCallback(() => {
    console.log('🔄 Force showing homepage skeleton');
    setShowHomepageSkeleton(true);
  }, []);

  const clearHomepageSkeleton = useCallback(() => {
    console.log('🧹 Clearing homepage skeleton');
    setShowHomepageSkeleton(false);
  }, []);

  return (
    <GenerationContext.Provider
      value={{
        isGenerating,
        setIsGenerating,
        showHomepageSkeleton,
        setShowHomepageSkeleton,
        startGeneration,
        stopGeneration,
        forceHomepageSkeleton,
        clearHomepageSkeleton,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
} 