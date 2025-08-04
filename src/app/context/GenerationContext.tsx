"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GenerationContextType {
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  generationPrompt: string;
  setGenerationPrompt: (prompt: string) => void;
  startGeneration: (prompt: string) => void;
  stopGeneration: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState('');

  const startGeneration = (prompt: string) => {
    setGenerationPrompt(prompt);
    setIsGenerating(true);
  };

  const stopGeneration = () => {
    setIsGenerating(false);
    setGenerationPrompt('');
  };

  return (
    <GenerationContext.Provider
      value={{
        isGenerating,
        setIsGenerating,
        generationPrompt,
        setGenerationPrompt,
        startGeneration,
        stopGeneration,
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