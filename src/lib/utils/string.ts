/**
 * Converts a string to a URL-friendly slug
 * @param str - The string to convert
 * @returns A URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Capitalize the first letter of each word in a string
 * @param str - The string to capitalize
 * @returns The string with the first letter of each word capitalized
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncate a string to a maximum length and add an ellipsis if truncated
 * @param str - The string to truncate
 * @param maxLength - The maximum length of the string
 * @returns The truncated string with an ellipsis if truncated
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
} 