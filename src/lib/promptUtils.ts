/**
 * Utility functions for cleaning and formatting AI-generated prompts
 */

/**
 * Cleans AI-generated prompts by removing common formatting artifacts
 * @param prompt - The raw prompt string from AI
 * @returns Cleaned prompt string
 */
export function cleanPrompt(prompt: string): string {
  return prompt
    .replace(/\*\*/g, '') // Remove **
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\/\*/g, '') // Remove /* 
    .replace(/\*\//g, '') // Remove */
    .replace(/^\s*['"]\s*/, '') // Remove leading quotes and spaces
    .replace(/\s*['"]\s*$/, '') // Remove trailing quotes and spaces
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\|/g, '') // Remove pipe characters
    .replace(/\\/g, '') // Remove backslashes
    .replace(/\*([^*]+)\*/g, '$1') // Remove text between asterisks but keep the text
    .replace(/AI Response:\s*/gi, '') // Remove "AI Response:" prefix
    .replace(/Create a.*?thumbnail for\s*\*([^*]+)\*/gi, 'Create a thumbnail for $1') // Clean up specific patterns
    .replace(/\*\([^)]*\)/g, '') // Remove metadata in asterisks at the end
    .replace(/\s+/g, ' ') // Normalize spaces again
    .trim();
}

/**
 * Extracts key words from a prompt for better search matching
 * @param prompt - The cleaned prompt string
 * @returns Array of key words
 */
export function extractKeyWords(prompt: string): string[] {
  const clean = cleanPrompt(prompt);
  return clean
    .split(/\s+/)
    .filter((word: string) => word.length > 2)
    .filter((word: string) => word.length > 3)
    .slice(0, 5); // Limit to 5 key words
}

/**
 * Generates search queries for finding related thumbnails
 * @param prompt - The original prompt string
 * @returns Array of search query strings
 */
export function generateSearchQueries(prompt: string): string[] {
  const clean = cleanPrompt(prompt);
  const words = clean.split(/\s+/).filter((word: string) => word.length > 2);
  const keyWords = words.filter((word: string) => word.length > 3).slice(0, 3);
  
  const queries: string[] = [];
  
  // 1. Exact phrase match (if long enough)
  if (clean.length > 10) {
    queries.push(`%${clean}%`);
  }
  
  // 2. First 3-4 words
  if (words.length >= 3) {
    queries.push(`%${words.slice(0, 3).join(" ")}%`);
  }
  
  // 3. Individual key words
  keyWords.forEach((word: string) => {
    queries.push(`%${word}%`);
  });
  
  // Remove duplicates and return
  return [...new Set(queries)];
} 