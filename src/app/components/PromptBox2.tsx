import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import {
  ArrowUp as ArrowUpIcon,
  AlignCenter as AlignCenterIcon,
  Ban as BanIcon,
  LockIcon,
  GlobeIcon,
  MicIcon,
  CrosshairIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  ArrowDownRightIcon,
  ArrowUpLeftIcon,
  ArrowLeftIcon,
  ArrowDownLeftIcon,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { cleanPrompt } from "@/lib/promptUtils";
import { useGeneration } from "@/app/context/GenerationContext";

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

interface PromptBox2Props {
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  textPosition?:
    | "auto"
    | "top-right"
    | "right-center"
    | "bottom-right"
    | "top-left"
    | "left-center"
    | "bottom-left"
    | "center"
    | "no-text";
  onTextPositionChange?: (
    position:
      | "auto"
      | "top-right"
      | "right-center"
      | "bottom-right"
      | "top-left"
      | "left-center"
      | "bottom-left"
      | "center"
      | "no-text"
  ) => void;
  isPublic?: boolean;
  onIsPublicChange?: (isPublic: boolean) => void;
  onVoiceClick?: () => void;
  disabled?: boolean;
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; // Set this in your env

// Utility to clean Gemini output: remove **, /, or ' from start/end and inside
function cleanGeminiSuggestion(s: string): string {
  // Use the centralized prompt cleaning utility
  return cleanPrompt(s);
}

// Position display names mapping
const positionDisplayNames = {
  "auto": "Auto",
  "top-right": "Top Right",
  "right-center": "Right Center", 
  "bottom-right": "Bottom Right",
  "top-left": "Top Left",
  "left-center": "Left Center",
  "bottom-left": "Bottom Left",
  "center": "Center",
  "no-text": "No Text"
};

export const PromptBox2: React.FC<PromptBox2Props> = ({
  className,
  value: externalValue,
  onChange,
  onSubmit,
  isLoading,
  textPosition: externalPosition,
  onTextPositionChange,
  isPublic: externalPublic,
  onIsPublicChange,
  onVoiceClick,
  disabled = false,
}) => {
  const { isGenerating, startGeneration } = useGeneration();
  const [value, setValue] = React.useState(externalValue || "");
  const [selectedPosition, setSelectedPosition] = React.useState(
    externalPosition || "center"
  );
  const [isPublic, setIsPublic] = React.useState<boolean>(
    externalPublic ?? true
  );
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [isAISuggesting, setIsAISuggesting] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Sync with external state
  React.useEffect(() => {
    if (externalValue !== undefined) setValue(externalValue);
  }, [externalValue]);

  React.useEffect(() => {
    if (externalPosition !== undefined) setSelectedPosition(externalPosition);
  }, [externalPosition]);

  React.useEffect(() => {
    if (externalPublic !== undefined) setIsPublic(externalPublic);
  }, [externalPublic]);

  // Handle hydration
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Adjust textarea height
  React.useEffect(() => {
    if (internalTextareaRef.current) {
      internalTextareaRef.current.style.height = 'auto';
      internalTextareaRef.current.style.height = internalTextareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const hasValue = value.trim().length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  const handlePositionChange = (
    position:
      | "auto"
      | "top-right"
      | "right-center"
      | "bottom-right"
      | "top-left"
      | "left-center"
      | "bottom-left"
      | "center"
      | "no-text"
  ) => {
    setSelectedPosition(position);
    setIsPopoverOpen(false);
    if (onTextPositionChange) {
      onTextPositionChange(position);
    }
  };

  const handlePrivacyChange = (checked: boolean) => {
    const newIsPublic = !checked;
    setIsPublic(newIsPublic);
    if (onIsPublicChange) {
      onIsPublicChange(newIsPublic);
    }
  };

  const handleAISuggest = async () => {
    if (!GEMINI_API_KEY) {
      setAiError("AI suggestions not configured");
      return;
    }

    setIsAISuggesting(true);
    setAiError(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: "Generate a extremely creative YouTube thumbnail prompt. Make it engaging, viral-worthy, and specific. Return only the prompt text, nothing else(no emoji as well). Keep it under 5-10 words.(e.g. ironman on the sky, top 10 gadets, top courses to learn ai 2025, learn to code in 5 days, etc)",
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await response.json();

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const suggestion = cleanGeminiSuggestion(data.candidates[0].content.parts[0].text);
        setValue(suggestion);
        if (onChange) {
          onChange(suggestion);
        }
      } else {
        setAiError("No suggestion found");
      }
    } catch (e: any) {
      setAiError("Could not get suggestion");
    } finally {
      setIsAISuggesting(false);
    }
  };

  // Workaround for Radix Portal/Popover/Tooltip NotFoundError bug:
  // Always render all Radix portals at the end of the document body, and never inside a React subtree that may be unmounted/remounted.
  // This avoids "insertBefore" NotFoundError when React unmounts/remounts subtree containing a portal root.
  // See: https://github.com/radix-ui/primitives/issues/1672

  // Use a stable container for all portals
  const getPortalContainer = React.useCallback(() => {
    if (typeof window !== "undefined") {
      let el = document.getElementById("radix-portal-root");
      if (!el) {
        el = document.createElement("div");
        el.id = "radix-portal-root";
        document.body.appendChild(el);
      }
      return el;
    }
    return null;
  }, []);

  // Memoize portal container for Radix
  const portalContainer = React.useMemo(() => getPortalContainer(), [
    getPortalContainer,
  ]);

  // Provide a custom container for all Radix portals
  const radixPortalProps = portalContainer ? { container: portalContainer } : {};

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={cn(
          "flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text",
          className
        )}
      >
        <textarea
          rows={1}
          placeholder="Write a few words..."
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12 max-h-32 sm:max-h-40"
          style={{
            height: 'auto',
            minHeight: '48px',
            maxHeight: '128px'
          }}
          disabled
        />
        <div className="mt-0.5 p-1 pt-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-7 w-7 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Responsive layout: on desktop, text position selector is on the left; on mobile, it's in the same row as privacy
  // We'll use CSS to control order and flex direction
  return (
    <div
      className={cn(
        "flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white border dark:bg-[#303030] dark:border-transparent cursor-text",
        className
      )}
    >
      <textarea
        ref={internalTextareaRef}
        value={value}
        onChange={handleInputChange}
        rows={1}
        placeholder="Write a few words..."
        disabled={isGenerating || disabled}
        className={cn(
          "custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-gray-300 focus:ring-0 focus-visible:outline-none min-h-12 max-h-32 sm:max-h-40",
          (isGenerating || disabled) && "opacity-50 cursor-not-allowed"
        )}
        style={{
          height: 'auto',
          minHeight: '48px',
          maxHeight: '128px'
        }}
      />

      <div className="mt-0.5 p-1 pt-0">
        <TooltipPrimitive.Provider delayDuration={100}>
          {/* Single row layout: left side (switcher + selector), right side (AI + mic + send) */}
          <div className="flex items-center justify-between gap-2">
            {/* Left side: Text Position Selector + Privacy Switch */}
            <div className="flex items-center gap-2">
              {/* Text Position Selector */}
              <PopoverPrimitive.Root
                open={isPopoverOpen}
                onOpenChange={setIsPopoverOpen}
              >
                <TooltipPrimitive.Root>
                  <TooltipPrimitive.Trigger asChild>
                    <PopoverPrimitive.Trigger asChild>
                      <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                          "flex h-7 w-auto sm:h-8 sm:w-auto items-center gap-1.5 rounded-full px-2 py-1 text-sm text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none",
                          disabled && "opacity-60 pointer-events-none"
                        )}
                      >
                        {selectedPosition === "auto" && (
                          <CrosshairIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "top-right" && (
                          <ArrowUpRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "right-center" && (
                          <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "bottom-right" && (
                          <ArrowDownRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "top-left" && (
                          <ArrowUpLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "left-center" && (
                          <ArrowLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "bottom-left" && (
                          <ArrowDownLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "center" && (
                          <AlignCenterIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        {selectedPosition === "no-text" && (
                          <BanIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                        <span className="hidden sm:inline text-xs sm:text-sm">{positionDisplayNames[selectedPosition as keyof typeof positionDisplayNames]}</span>
                      </button>
                    </PopoverPrimitive.Trigger>
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Content
                    side="top"
                    className="relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs"
                    {...radixPortalProps}
                  >
                    <p>Text Position: {positionDisplayNames[selectedPosition as keyof typeof positionDisplayNames]}</p>
                    <TooltipPrimitive.Arrow className="-my-px fill-popover" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Root>
                <PopoverPrimitive.Content
                  side="top"
                  align="start"
                  sideOffset={5}
                  className="z-[9999] w-64 rounded-xl bg-popover dark:bg-[#303030] p-2 text-popover-foreground dark:text-white shadow-md max-h-[60vh] overflow-y-auto"
                  {...radixPortalProps}
                >
                  <div className="flex flex-col gap-1">
                    {[
                      "auto",
                      "top-right",
                      "right-center",
                      "bottom-right",
                      "top-left",
                      "left-center",
                      "bottom-left",
                      "center",
                      "no-text",
                    ].map((position) => (
                      <button
                        key={position}
                        onClick={() =>
                          handlePositionChange(
                            position as
                              | "auto"
                              | "top-right"
                              | "right-center"
                              | "bottom-right"
                              | "top-left"
                              | "left-center"
                              | "bottom-left"
                              | "center"
                              | "no-text"
                          )
                        }
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent dark:hover:bg-[#515151]"
                      >
                        {position === "auto" && (
                          <CrosshairIcon className="h-4 w-4" />
                        )}
                        {position === "top-right" && (
                          <ArrowUpRightIcon className="h-4 w-4" />
                        )}
                        {position === "right-center" && (
                          <ArrowRightIcon className="h-4 w-4" />
                        )}
                        {position === "bottom-right" && (
                          <ArrowDownRightIcon className="h-4 w-4" />
                        )}
                        {position === "top-left" && (
                          <ArrowUpLeftIcon className="h-4 w-4" />
                        )}
                        {position === "left-center" && (
                          <ArrowLeftIcon className="h-4 w-4" />
                        )}
                        {position === "bottom-left" && (
                          <ArrowDownLeftIcon className="h-4 w-4" />
                        )}
                        {position === "center" && (
                          <AlignCenterIcon className="h-4 w-4" />
                        )}
                        {position === "no-text" && (
                          <BanIcon className="h-4 w-4" />
                        )}
                        <span>{positionDisplayNames[position as keyof typeof positionDisplayNames]}</span>
                      </button>
                    ))}
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Root>

              {/* Privacy Switch */}
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs sm:text-sm text-foreground dark:text-white transition-colors",
                      "bg-transparent dark:bg-white/10 sm:dark:bg-transparent"
                    )}
                  >
                    {isPublic ? (
                      <GlobeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    ) : (
                      <LockIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <Switch
                      checked={!isPublic}
                      onCheckedChange={handlePrivacyChange}
                      disabled={disabled}
                      className="scale-75 sm:scale-100"
                    />
                    <span className="hidden sm:inline">{isPublic ? "Public" : "Private"}</span>
                  </div>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Content
                  side="top"
                  className="relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs"
                  {...radixPortalProps}
                >
                  <p>Privacy Setting</p>
                  <TooltipPrimitive.Arrow className="-my-px fill-popover" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Root>
            </div>

            {/* Right side: AI, Mic, Send buttons */}
            <div className="flex items-center gap-1.5">
              {/* AI Suggestion Button */}
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    type="button"
                    onClick={handleAISuggest}
                    disabled={isAISuggesting || isGenerating || disabled}
                    className={cn(
                      "flex items-center justify-center rounded-full text-foreground dark:text-white transition-colors",
                      "h-7 w-7 sm:h-8 sm:w-8",
                      "hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none",
                      (isAISuggesting || isGenerating || disabled) && "opacity-60 pointer-events-none"
                    )}
                    aria-label="Suggest prompt"
                  >
                    <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">Suggest prompt</span>
                  </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Content
                  side="top"
                  className="relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs"
                  {...radixPortalProps}
                >
                  <p>AI Suggestion</p>
                  <TooltipPrimitive.Arrow className="-my-px fill-popover" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Root>

              {/* Mic Button */}
              {onVoiceClick && (
                <TooltipPrimitive.Root>
                  <TooltipPrimitive.Trigger asChild>
                    <button
                      type="button"
                      onClick={onVoiceClick}
                      disabled={isGenerating || disabled}
                      className={cn(
                        "flex items-center justify-center rounded-full text-foreground dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151] focus-visible:outline-none h-7 w-7 sm:h-8 sm:w-8",
                        (isGenerating || disabled) && "opacity-60 pointer-events-none"
                      )}
                    >
                      <MicIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="sr-only">Record voice</span>
                    </button>
                  </TooltipPrimitive.Trigger>
                  <TooltipPrimitive.Content
                    side="top"
                    className="relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs"
                    {...radixPortalProps}
                  >
                    <p>Record voice</p>
                    <TooltipPrimitive.Arrow className="-my-px fill-popover" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Root>
              )}

              {/* Send Button */}
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    type="submit"
                    onClick={() => {
                      if (hasValue && !isGenerating && !disabled) {
                        startGeneration();
                        onSubmit();
                      }
                    }}
                    disabled={!hasValue || isLoading || isGenerating || disabled}
                    className={cn(
                      "flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-white hover:bg-primary/80 dark:bg-white dark:text-black dark:hover:bg-white/80 disabled:bg-primary/40 dark:disabled:bg-white/40",
                      "h-7 w-7 sm:h-8 sm:w-8"
                    )}
                  >
                    <ArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="sr-only">Send message</span>
                  </button>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Content
                  side="top"
                  className="relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs"
                  {...radixPortalProps}
                >
                  <p>Send</p>
                  <TooltipPrimitive.Arrow className="-my-px fill-popover" />
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Root>
            </div>
          </div>

          {/* AI error message */}
          {aiError && (
            <div className="text-xs text-red-500 mt-1">{aiError}</div>
          )}
        </TooltipPrimitive.Provider>
      </div>
    </div>
  );
};
