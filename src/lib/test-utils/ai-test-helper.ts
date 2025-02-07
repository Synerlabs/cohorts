import { PaymentGateway } from '@/types/payment';

/**
 * AI Test Helper
 * This file contains type guards and validation functions that AI can use to validate changes
 * before committing them. Each function should be well-documented and return boolean or throw
 * with specific error messages.
 */

const CLIENT_HOOKS = [
  'useState',
  'useEffect',
  'useContext',
  'useReducer',
  'useCallback',
  'useMemo',
  'useRef',
  'useImperativeHandle',
  'useLayoutEffect',
  'useDebugValue',
  'useToast',
  'useRouter',
  'useSearchParams',
  'usePathname',
  'useParams',
];

/**
 * Validates that params and searchParams are properly awaited in Next.js pages
 */
export function validateParamsUsage(fileContent: string, filePath: string): boolean {
  // Only check page components
  if (!filePath.includes('/page.')) {
    return true;
  }

  // Check for non-awaited params or searchParams
  const paramPatterns = [
    {
      pattern: /(?<!await\s+)params\s*[,}]/,
      message: 'params must be awaited in page components. Use: const { params } = await props',
    },
    {
      pattern: /(?<!await\s+)searchParams\s*[,}]/,
      message: 'searchParams must be awaited in page components. Use: const { searchParams } = await props',
    },
    {
      pattern: /function\s+\w+\s*\(\s*{\s*params\s*,/,
      message: 'params must be awaited. Change function signature to: async function Page({ params, ...})',
    },
    {
      pattern: /function\s+\w+\s*\(\s*{\s*searchParams\s*,/,
      message: 'searchParams must be awaited. Change function signature to: async function Page({ searchParams, ...})',
    }
  ];

  for (const { pattern, message } of paramPatterns) {
    if (pattern.test(fileContent)) {
      throw new Error(message);
    }
  }

  // Check if the function is async when using params or searchParams
  if ((fileContent.includes('params') || fileContent.includes('searchParams')) && 
      !fileContent.includes('async function')) {
    throw new Error('Page component must be async when using params or searchParams');
  }

  return true;
}

/**
 * Validates that a Next.js page component doesn't use client hooks and follows server component patterns
 */
export function validateServerComponent(fileContent: string, filePath: string): boolean {
  // Only check page components
  if (!filePath.includes('/page.') || filePath.includes('/_components/')) {
    return true;
  }

  // Check for "use client" directive
  if (fileContent.includes('"use client"') || fileContent.includes("'use client'")) {
    throw new Error('Page components should not use "use client" directive. Move client-side logic to components in _components directory.');
  }

  // Check for client hooks imports
  const importLines = fileContent.split('\n').filter(line => line.trim().startsWith('import'));
  for (const line of importLines) {
    for (const hook of CLIENT_HOOKS) {
      if (line.includes(hook)) {
        throw new Error(`Page component cannot import client hook '${hook}'. Move client-side logic to a component in _components directory.`);
      }
    }
  }

  // Check for hook usage in code
  for (const hook of CLIENT_HOOKS) {
    const hookRegex = new RegExp(`\\b${hook}\\(`);
    if (hookRegex.test(fileContent)) {
      throw new Error(`Page component cannot use client hook '${hook}'. Move client-side logic to a component in _components directory.`);
    }
  }

  return true;
}

/**
 * Validates a payment gateway configuration
 */
export function validatePaymentGateway(gateway: unknown): gateway is PaymentGateway {
  if (!gateway || typeof gateway !== 'object') {
    throw new Error('Gateway must be an object');
  }

  const requiredFields = ['id', 'name', 'description', 'icon', 'enabled'];
  for (const field of requiredFields) {
    if (!(field in gateway)) {
      throw new Error(`Gateway is missing required field: ${field}`);
    }
  }

  const g = gateway as PaymentGateway;

  // Validate ID format
  if (typeof g.id !== 'string' || g.id.length === 0) {
    throw new Error('Gateway ID must be a non-empty string');
  }

  // Validate supported gateway types
  const supportedGateways = ['stripe', 'manual'];
  if (!supportedGateways.includes(g.id)) {
    throw new Error(`Gateway ID must be one of: ${supportedGateways.join(', ')}`);
  }

  // Validate name
  if (typeof g.name !== 'string' || g.name.length === 0) {
    throw new Error('Gateway name must be a non-empty string');
  }

  // Validate description
  if (typeof g.description !== 'string' || g.description.length === 0) {
    throw new Error('Gateway description must be a non-empty string');
  }

  // Validate enabled state
  if (typeof g.enabled !== 'boolean') {
    throw new Error('Gateway enabled state must be a boolean');
  }

  return true;
}

/**
 * Validates payment gateway route format
 */
export function validateGatewayRoute(route: string): boolean {
  const validRoutePattern = /^\/[^/]+\/settings\/payment-gateways\/(stripe|manual)$/;
  if (!validRoutePattern.test(route)) {
    throw new Error('Invalid gateway route format. Must match: /:orgSlug/settings/payment-gateways/(stripe|manual)');
  }
  return true;
}

/**
 * Validates payment gateway permissions
 */
export function validateGatewayPermissions(permissions: string[]): boolean {
  const requiredPermission = 'manage_payment_gateways';
  if (!permissions.includes(requiredPermission)) {
    throw new Error(`Missing required permission: ${requiredPermission}`);
  }
  return true;
}

/**
 * Validates payment gateway status
 */
export function validateGatewayStatus(status: unknown): boolean {
  const validStatuses = ['unconfigured', 'configured', 'disabled', 'error'] as const;
  if (!status || typeof status !== 'string' || !validStatuses.includes(status as any)) {
    throw new Error(`Invalid gateway status. Must be one of: ${validStatuses.join(', ')}`);
  }
  return true;
}

/**
 * Validates that mutations are handled by server actions
 */
export function validateMutationHandling(fileContent: string, filePath: string): boolean {
  // Skip validation for server action files and test files
  if (filePath.includes('_actions/') || filePath.includes('.test.') || filePath.includes('__tests__')) {
    return true;
  }

  // Check for direct fetch/axios calls for mutations
  const mutationPatterns = [
    {
      pattern: /\bfetch\([^)]*method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/,
      message: 'Direct fetch mutations should be moved to server actions in _actions directory',
    },
    {
      pattern: /\baxios\.[a-z]+\(/,
      message: 'Direct axios mutations should be moved to server actions in _actions directory',
    },
    {
      pattern: /\$fetch\([^)]*method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/,
      message: 'Direct $fetch mutations should be moved to server actions in _actions directory',
    }
  ];

  for (const { pattern, message } of mutationPatterns) {
    if (pattern.test(fileContent)) {
      throw new Error(message);
    }
  }

  return true;
}

/**
 * Validates proper usage of useToastStateAction for server actions
 */
export function validateToastStateActionUsage(fileContent: string, filePath: string): boolean {
  // Skip validation for non-component files
  if (!filePath.endsWith('.tsx') || filePath.includes('.test.') || filePath.includes('__tests__')) {
    return true;
  }

  // Check if file uses server actions
  const hasServerAction = fileContent.includes('_actions/') && 
    (fileContent.includes('import') || fileContent.includes('from'));

  if (hasServerAction) {
    // Check for proper useToastStateAction usage
    const hasToastStateAction = fileContent.includes('useToastStateAction');
    if (!hasToastStateAction) {
      throw new Error('Server actions should be wrapped with useToastStateAction for proper toast and loading state management');
    }

    // Check for direct toast usage with server actions
    if (fileContent.includes('useToast') && 
        fileContent.includes('_actions/') && 
        !fileContent.includes('use-toast-state-action')) {
      throw new Error('Use useToastStateAction instead of direct useToast with server actions');
    }
  }

  return true;
}

/**
 * Validates database migration creation process
 */
export function validateMigrationCreation(filePath: string): boolean {
  // Check if this is a migration file
  if (!filePath.includes('supabase/migrations/')) {
    return true;
  }

  throw new Error(
    'Do not create migration files directly. Instead use one of these methods:\n' +
    '\nMethod 1 - For schema changes:\n' +
    '1. Make the schema changes in the database\n' +
    '2. Run `npx supabase db diff --schema public` to generate the migration\n' +
    '3. Review and adjust the generated migration file if needed\n' +
    '\nMethod 2 - For new migrations:\n' +
    '1. Run `npx supabase migration new your_migration_name`\n' +
    '2. Add your SQL statements to the generated file\n' +
    '3. Run `npx supabase migration up` to apply the changes'
  );
}

/**
 * AI-specific test utilities
 */
export const aiTestUtils = {
  /**
   * Validates changes made to payment gateway configuration
   */
  validateGatewayChanges: (
    originalGateways: PaymentGateway[],
    updatedGateways: PaymentGateway[]
  ): boolean => {
    // Ensure we haven't lost any gateways
    if (updatedGateways.length < originalGateways.length) {
      throw new Error('Payment gateways were removed - this is not allowed');
    }

    // Validate each gateway
    updatedGateways.forEach(validatePaymentGateway);

    // Ensure required gateways exist
    const requiredGateways = ['stripe', 'manual'];
    requiredGateways.forEach(id => {
      if (!updatedGateways.some(g => g.id === id)) {
        throw new Error(`Required gateway '${id}' is missing`);
      }
    });

    return true;
  },

  /**
   * Validates UI component structure
   */
  validateUIStructure: (container: Element): boolean => {
    // Check for required UI elements
    const requiredElements = [
      { selector: 'h1', text: 'Payment Gateways' },
      { selector: 'button, a', text: 'Configure' },
      { selector: '[class*="Card"]', minCount: 2 },
      { selector: '[role="switch"]', minCount: 2 },
      { selector: 'label', text: /Enabled|Disabled/ },
    ];

    for (const { selector, text, minCount } of requiredElements) {
      const elements = container.querySelectorAll(selector);
      if (minCount && elements.length < minCount) {
        throw new Error(`Expected at least ${minCount} ${selector} elements`);
      }
      if (text && ![...elements].some(el => 
        text instanceof RegExp ? text.test(el.textContent || '') : el.textContent?.includes(text)
      )) {
        throw new Error(`Missing required text "${text}" in ${selector}`);
      }
    }

    return true;
  },

  /**
   * Validates gateway route format
   */
  validateGatewayRoute,

  /**
   * Validates gateway permissions
   */
  validateGatewayPermissions,

  /**
   * Validates gateway status
   */
  validateGatewayStatus,

  /**
   * Validates no client hooks in pages
   */
  validateNoClientHooks: validateServerComponent,

  /**
   * Validates server component patterns
   */
  validateServerComponent,

  /**
   * Validates params and searchParams usage
   */
  validateParamsUsage,

  /**
   * Validates mutation handling
   */
  validateMutationHandling,

  /**
   * Validates useToastStateAction usage
   */
  validateToastStateActionUsage,

  /**
   * Validates migration creation
   */
  validateMigrationCreation,
}; 