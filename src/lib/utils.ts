import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map PromptBox2 text position values to generate API text position values
export function mapTextPositionToAPI(position: string): string {
  const positionMap: Record<string, string> = {
    'auto': 'auto',
    'top-right': 'top',
    'right-center': 'top',
    'bottom-right': 'bottom',
    'top-left': 'top',
    'left-center': 'top',
    'bottom-left': 'bottom',
    'center': 'center',
    'no-text': 'auto'
  };
  
  return positionMap[position] || 'auto';
}
