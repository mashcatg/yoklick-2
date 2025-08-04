"use client";
import { useState, useEffect } from "react";
import { PromptBox2 } from "./PromptBox2";
import { useGeneration } from "@/app/context/GenerationContext";

interface PromptSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  textPosition?: "auto" | "top-right" | "right-center" | "bottom-right" | "top-left" | "left-center" | "bottom-left" | "center" | "no-text";
  onTextPositionChange?: (position: "auto" | "top-right" | "right-center" | "bottom-right" | "top-left" | "left-center" | "bottom-left" | "center" | "no-text") => void;
  isPublic?: boolean;
  onIsPublicChange?: (isPublic: boolean) => void;
  onVoiceClick?: () => void;
  className?: string;
  disabled?: boolean;
}

// Categorized prompt suggestions
const PROMPT_SUGGESTIONS = {
  tech: [
    "iPhone 15 Review",
    "Fix Slow Laptop",
    "Free AI Tools 2024",
    "Windows 11 Upgrade?",
    "My Desk Setup",
    "Learn Coding Fast",
    "Top Chrome Extensions",
    "Is ChatGPT Worth It?",
    "Switched to Linux",
    "Edit Videos on Phone",
    "Smart Home Security",
    "Best Tech Gadgets"
  ],
  lifestyle: [
    "My morning routine",
    "How I lost 20kg",
    "Day in the life of a CEO",
    "Making a viral TikTok",
    "Cake with only 3 ingredients",
    "My first marathon",
    "How to get free stuff online",
    "Ultimate productivity hacks",
    "Best budget travel tips",
    "Trying every Starbucks drink",
    "Why do cats hate water?",
    "Can you solve this puzzle?"
  ],
  entertainment: [
    "Ironman on the sky",
    "How to get 1M subscribers",
    "Traveling to Mars vlog",
    "Unboxing the iPhone 20",
    "Epic gaming montage",
    "Behind the scenes: Movie magic",
    "How to draw anime",
    "What if animals could talk?",
    "Make $1000 in a week",
    "Best street food in Tokyo",
    "24 hours in New York",
    "Ultimate gaming setup"
  ],
  business: [
    "How to get 1M subscribers",
    "Make $1000 in a week",
    "Day in the life of a CEO",
    "Making a viral TikTok",
    "How to get free stuff online",
    "Ultimate productivity hacks",
    "How to invest as a teen",
    "Best budget travel tips",
    "Building passive income",
    "Start a business with $100",
    "Social media marketing secrets",
    "Freelancing success tips"
  ],
  travel: [
    "Traveling to Mars vlog",
    "Best street food in Tokyo",
    "24 hours in New York",
    "Best budget travel tips",
    "Hidden gems in Paris",
    "Backpacking through Asia",
    "Luxury travel on a budget",
    "Solo travel adventures",
    "Travel photography tips",
    "Local food experiences",
    "Budget accommodation hacks",
    "Travel planning mistakes"
  ],
  health: [
    "How I lost 20kg",
    "My first marathon",
    "The science of happiness",
    "What happens if you never sleep?",
    "Morning workout routine",
    "Healthy meal prep ideas",
    "Mental health tips",
    "Fitness transformation",
    "Yoga for beginners",
    "Nutrition myths debunked",
    "Stress management techniques",
    "Sleep optimization tips"
  ]
};

export default function PromptSection({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  textPosition = "auto",
  onTextPositionChange,
  isPublic = true,
  onIsPublicChange,
  onVoiceClick,
  className = "",
  disabled = false
}: PromptSectionProps) {
  const { forceHomepageSkeleton } = useGeneration();
  const [hydrated, setHydrated] = useState(false);
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setHydrated(true);
    
    // Flatten all suggestions and shuffle them
    const allSuggestions = Object.values(PROMPT_SUGGESTIONS).flat();
    const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
    
    // Check mobile status only after hydration
    const checkMobile = () => {
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(mobile);
      setRandomSuggestions(shuffled.slice(0, mobile ? 3 : 5));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`max-w-xl mx-auto w-full ${className}`}>
      {/* Prompt Box2 */}
      <PromptBox2
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        isLoading={isLoading}
        textPosition={textPosition}
        onTextPositionChange={onTextPositionChange}
        isPublic={isPublic}
        onIsPublicChange={onIsPublicChange}
        onVoiceClick={onVoiceClick}
        disabled={disabled}
      />
      
      {/* Prompt Suggestions */}
      {hydrated && (
        <div className="mt-4 space-y-2">
          {/* Top row: 2 suggestions on mobile, 3 on desktop */}
          <div className="flex flex-wrap justify-center gap-2">
            {randomSuggestions.slice(0, isMobile ? 2 : 3).map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                className="px-3 py-1 rounded-full bg-muted hover:bg-primary/10 text-xs md:text-sm text-muted-foreground hover:text-primary border border-border transition-colors"
                onClick={() => {
                  onChange(suggestion);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          {/* Bottom row: 1 suggestion on mobile, 2 on desktop */}
          {randomSuggestions.length > (isMobile ? 2 : 3) && (
            <div className="flex flex-wrap justify-center gap-2">
              {randomSuggestions.slice(isMobile ? 2 : 3).map((suggestion, idx) => (
                <button
                  key={idx + (isMobile ? 2 : 3)}
                  type="button"
                  className="px-3 py-1 rounded-full bg-muted hover:bg-primary/10 text-xs md:text-sm text-muted-foreground hover:text-primary border border-border transition-colors"
                  onClick={() => {
                    onChange(suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 