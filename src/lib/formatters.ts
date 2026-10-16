/**
 * String formatting utilities for data entry cleanliness and consistency.
 */

/**
 * Capitalizes the first letter of each word (Title Case).
 * Works seamlessly with spaces, dashes, slashes, and parentheses.
 * Examples:
 *   "chemistry lab"          -> "Chemistry Lab"
 *   "main store - rack u1"   -> "Main Store - Rack U1"
 *   "priya sharma"           -> "Priya Sharma"
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str.replace(/(^|[ \t\-_/(\[])([a-z])/g, (_, boundary, letter) => {
    return boundary + letter.toUpperCase();
  });
}

/**
 * Capitalizes only the first character of the string (Sentence Case).
 * Examples:
 *   "apple" -> "Apple"
 *   "123 lab" -> "123 lab"
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
