/**
 * Feature flags to control feature visibility during development
 * 
 * This module provides a simple way to toggle features on/off
 * without having to modify code in multiple places.
 */

// Define the feature flags
const FEATURES = {
  // Payment gateways
  XENDIT_ENABLED: false, // Set to false to hide Xendit during development
  
  // Add more feature flags as needed
  // EXAMPLE_FEATURE: true,
};

/**
 * Check if a feature is enabled
 * @param featureName - The name of the feature to check
 * @returns true if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(featureName: keyof typeof FEATURES): boolean {
  // Check if a feature flag is enabled by environment variable override
  const envOverride = typeof window !== 'undefined' 
    ? localStorage.getItem(`FEATURE_${featureName}`) 
    : process.env[`FEATURE_${featureName}`];
    
  if (envOverride !== null) {
    return envOverride === 'true';
  }
  
  // Fall back to the default value
  return FEATURES[featureName];
}

/**
 * Enable a feature flag (in localStorage when in browser)
 * @param featureName - The name of the feature to enable
 */
export function enableFeature(featureName: keyof typeof FEATURES): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`FEATURE_${featureName}`, 'true');
  }
}

/**
 * Disable a feature flag (in localStorage when in browser)
 * @param featureName - The name of the feature to disable
 */
export function disableFeature(featureName: keyof typeof FEATURES): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`FEATURE_${featureName}`, 'false');
  }
} 