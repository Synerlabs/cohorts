import { format as formatDateFn } from "date-fns";

/**
 * Format a date string
 * @param dateString ISO date string
 * @param formatStr Optional format string, defaults to 'MMM d, yyyy'
 * @returns Formatted date string
 */
export function formatDate(dateString: string | null, formatStr: string = 'MMM d, yyyy'): string {
  if (!dateString) return 'N/A';
  
  try {
    return formatDateFn(new Date(dateString), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a currency amount
 * @param amount Amount as number
 * @param currency Currency code (e.g., 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount} ${currency}`;
  }
} 