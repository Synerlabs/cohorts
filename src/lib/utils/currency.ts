export const formatAmount = (amount: number, currency: string) => {
  const currencyCode = currency.toUpperCase();
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);

  // Add currency type for specific currencies that need disambiguation
  switch (currencyCode) {
    case 'USD':
      return `${formattedNumber} (US)`;
    case 'CAD':
      return `${formattedNumber} (CAD)`;
    case 'SGD':
      return `${formattedNumber} (SGD)`;
    case 'AUD':
      return `${formattedNumber} (AUD)`;
    case 'HKD':
      return `${formattedNumber} (HKD)`;
    case 'NZD':
      return `${formattedNumber} (NZD)`;
    default:
      return formattedNumber;
  }
}; 