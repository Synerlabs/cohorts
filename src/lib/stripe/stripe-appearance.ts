import { Appearance } from '@stripe/stripe-js';

/**
 * Stripe Element appearance configuration
 * Documentation: https://stripe.com/docs/elements/appearance-api
 */
export const stripeAppearance: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: 'hsl(0, 0%, 9%)', // Using primary from theme
    colorBackground: 'white',
    tabIconSelectedColor: 'hsl(0, 0%, 9%)',
    colorText: 'hsl(0, 0%, 9%)', // Using primary text
    colorDanger: 'hsl(0, 84.2%, 60.2%)', // Using destructive from theme
    fontFamily: 'system-ui, -apple-system, sans-serif',
    spacingUnit: '4px',
    borderRadius: '0.5rem', // Matching --radius
    fontSizeBase: '15px',
    fontSizeSm: '13px',
    fontSizeLg: '16px', // For mobile inputs to prevent zoom
    fontWeightNormal: '400',
    fontWeightMedium: '500',
  },
  rules: {
    '.Input': {
      border: '1px solid hsl(0, 0%, 89.8%)', // Using border from theme
      boxShadow: 'none',
      fontSize: '15px',
      padding: '10px 14px',
    },
    '.Input:focus': {
      border: '1px solid hsl(0, 0%, 9%)', // Primary color on focus
      boxShadow: '0 0 0 1px hsl(0, 0%, 9%)', // Primary as ring
    },
    '.Label': {
      fontSize: '14px',
      fontWeight: '500',
      color: 'hsl(0, 0%, 45.1%)', // Using muted-foreground
      marginBottom: '8px',
    },
    '.Error': {
      color: 'hsl(0, 84.2%, 60.2%)', // Using destructive from theme
      fontSize: '13px',
    },
    '.Tab': {
      border: '1px solid hsl(0, 0%, 89.8%)',
      boxShadow: 'none',
      backgroundColor: 'white',
    },
    '.Tab:hover': {
      backgroundColor: 'hsl(0, 0%, 96.1%)', // Using secondary color
    },
    '.Tab--selected': {
      border: '1px solid hsl(0, 0%, 9%)',
      boxShadow: '0 0 0 1px hsl(0, 0%, 9%)',
      backgroundColor: 'white',
    },
    '.TabIcon': {
      color: 'hsl(0, 0%, 45.1%)', // Using muted-foreground
      marginRight: '8px',
      opacity: '1 !important',
      fill: 'hsl(0, 0%, 45.1%) !important',
    },
    '.Tab--selected .TabIcon': {
      color: 'hsl(0, 0%, 9%) !important', // Match text color for selected tab
      fill: 'hsl(0, 0%, 9%) !important',
    },
    '.TabLabel': {
      color: 'hsl(0, 0%, 9%)', // Using primary text
      fontWeight: '500',
    },
    '.TabMore': {
      fontSize: '14px',
    },
    // Make card number field take full width
    '.CardNumberField': {
      width: '100%',
    },
    '.CardNumber': {
      width: '100%',
    },
    // Add proper spacing between fields
    '.FormSection': {
      marginTop: '16px',
    },
    // Better error state visibility
    '.Input--invalid': {
      borderColor: 'hsl(0, 84.2%, 60.2%)',
    },
    // Improve placeholder color for better contrast
    '::placeholder': {
      color: 'hsl(0, 0%, 65%)',
    }
  }
};

/**
 * Get optimized Stripe appearance based on whether the device is mobile
 * @param isMobile Whether the device is mobile
 * @returns Optimized Stripe appearance
 */
export function getOptimizedStripeAppearance(isMobile = false): Appearance {
  const baseRules = stripeAppearance.rules || {};
  const baseInputStyles = baseRules['.Input'] || {};
  
  return {
    ...stripeAppearance,
    rules: {
      ...baseRules,
      '.Input': {
        ...baseInputStyles,
        // On mobile, use larger font size and padding for better touch targets
        fontSize: isMobile ? '16px' : '15px',
        padding: isMobile ? '12px 14px' : '10px 14px',
      }
    }
  };
} 