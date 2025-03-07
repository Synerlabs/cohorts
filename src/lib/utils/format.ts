/**
 * Formats a currency amount with the appropriate currency symbol
 * 
 * @param amount - The amount in minor units (cents)
 * @param currency - The currency code (USD, EUR, etc.)
 * @returns A formatted currency string
 */
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Formats a date into a readable string
 * 
 * @param date - Date string to format
 * @returns A formatted date string
 */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
} 