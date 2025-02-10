export const currencySymbols = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'CAD': 'C$',
  'AUD': 'A$'
} as const;

/**
 * Formats a price in cents to a currency string
 * @param price - The price in cents
 * @param currency - The currency code (e.g. 'USD', 'EUR')
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: number, currency: string, locale: string = 'en-US') => {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  return formatter.format(price / 100);
}; 