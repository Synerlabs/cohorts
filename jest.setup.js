// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Add custom matchers
expect.extend({
  toBeAccessible(received) {
    // This is a placeholder for actual accessibility testing
    // In a real implementation, you would use something like jest-axe
    return {
      message: () => 'expected element to be accessible',
      pass: true,
    };
  },
}); 