"use client";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = [
    { value: "system", icon: Monitor, label: "System" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "light", icon: Sun, label: "Light" },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1 p-1 bg-muted rounded-full border border-border">
        {themes.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            className={`p-1 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              theme === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setTheme(value)}
            aria-label={`Switch to ${label} theme`}
            type="button"
          >
            <Icon size={16} strokeWidth={1.8} />
          </button>
        ))}
      </div>
    </div>
  );
} 