export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

export const currencySymbols: Record<CurrencyCode, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'CAD': 'C$',
  'AUD': 'A$'
} as const;

/**
 * Validates if a given string is a supported currency code
 */
export const isSupportedCurrency = (currency: string): currency is CurrencyCode => {
  return currency in currencySymbols;
};

/**
 * Formats a price in cents to a currency string
 * @param price - The price in cents
 * @param currency - The currency code (e.g. 'USD', 'EUR')
 * @param locale - The locale to use for formatting (defaults to 'en-US')
 * @returns Formatted price string with currency symbol
 * @throws Error if currency is not supported
 */
export const formatPrice = (price: number, currency: string, locale: string = 'en-US'): string => {
  // Input validation
  if (typeof price !== 'number' || isNaN(price)) {
    return 'Invalid price';
  }

  if (!isSupportedCurrency(currency)) {
    return `${price / 100} ${currency}`;
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(price / 100);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${currencySymbols[currency as CurrencyCode]}${(price / 100).toFixed(2)}`;
  }
}; 