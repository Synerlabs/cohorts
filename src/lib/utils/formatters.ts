/**
 * Format a number as currency (USD by default)
 */
export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to a more readable format
 */
export function formatDate(dateString: string, options: Intl.DateTimeFormatOptions = {}): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date);
}

/**
 * Format a number with commas
 */
export function formatNumber(number: number): string {
  return new Intl.NumberFormat('en-US').format(number);
}

/**
 * Truncate a string and add ellipsis if it exceeds maxLength
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
} 