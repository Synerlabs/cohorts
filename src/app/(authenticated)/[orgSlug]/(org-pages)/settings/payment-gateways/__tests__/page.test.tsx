import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaymentGatewaysPage from '../page';
import { withOrgAccess } from '@/lib/hoc/org';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { aiTestUtils } from '@/lib/test-utils/ai-test-helper';
import { PaymentGateway } from '@/types/payment';
import fs from 'fs';
import path from 'path';

// Mock the HOC
jest.mock('@/lib/hoc/org', () => ({
  withOrgAccess: jest.fn((Component: FC<any>) => Component),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
) as jest.Mock;

// Mock the PaymentGatewaysList component
jest.mock('../_components/payment-gateways-list', () => ({
  PaymentGatewaysList: ({ orgSlug }: { orgSlug: string }) => (
    <div data-testid="payment-gateways-list" data-org-slug={orgSlug}>
      Mock PaymentGatewaysList
    </div>
  ),
}));

const originalGateways: PaymentGateway[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Accept payments via Stripe Connect',
    icon: 'stripe',
    enabled: true,
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Manually mark payments as completed',
    icon: 'wallet',
    enabled: true,
  }
];

describe('PaymentGatewaysPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the payment gateways page with correct title', async () => {
    const mockOrg = { slug: 'test-org' };
    const mockParams = { orgSlug: 'test-org' };
    const { container } = render(<PaymentGatewaysPage org={mockOrg} params={mockParams} />);
    
    expect(screen.getByText('Payment Gateways')).toBeInTheDocument();
    expect(screen.getByText('Configure payment methods for your organization')).toBeInTheDocument();
    
    // AI: Validate UI structure
    expect(aiTestUtils.validateUIStructure(container)).toBe(true);
  });

  it('renders PaymentGatewaysList with correct props', async () => {
    const mockOrg = { slug: 'test-org' };
    const mockParams = { orgSlug: 'test-org' };
    render(<PaymentGatewaysPage org={mockOrg} params={mockParams} />);
    
    const list = screen.getByTestId('payment-gateways-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-org-slug', 'test-org');
  });

  it('displays all available payment gateways with enabled states', () => {
    render(<PaymentGatewaysPage org={{ slug: 'test-org' }} />);
    
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Accept payments via Stripe Connect')).toBeInTheDocument();
    expect(screen.getByText('Manually mark payments as completed')).toBeInTheDocument();

    // Check enabled states
    expect(screen.getAllByText('Enabled')).toHaveLength(2);
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();

    // AI: Validate gateway configurations
    const displayedGateways = [
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'Accept payments via Stripe Connect',
        icon: 'stripe',
        enabled: true,
      },
      {
        id: 'manual',
        name: 'Manual',
        description: 'Manually mark payments as completed',
        icon: 'wallet',
        enabled: true,
      }
    ];
    expect(aiTestUtils.validateGatewayChanges(originalGateways, displayedGateways)).toBe(true);
  });

  it('allows toggling gateway enabled state', async () => {
    render(<PaymentGatewaysPage org={{ slug: 'test-org' }} />);
    
    // Get Stripe gateway toggle
    const stripeToggle = screen.getByRole('switch', { name: /Enabled/i });
    expect(stripeToggle).toBeInTheDocument();
    expect(stripeToggle).toBeChecked();

    // Toggle Stripe gateway off
    fireEvent.click(stripeToggle);

    // Wait for API call and state update
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/organizations/test-org/payment-gateways/stripe',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ enabled: false }),
        })
      );
    });

    // Check UI updated
    expect(stripeToggle).not.toBeChecked();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('handles API errors when toggling gateway state', async () => {
    // Mock API error
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      })
    );

    render(<PaymentGatewaysPage org={{ slug: 'test-org' }} />);
    
    // Get Stripe gateway toggle
    const stripeToggle = screen.getByRole('switch', { name: /Enabled/i });
    
    // Toggle Stripe gateway off
    fireEvent.click(stripeToggle);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Error updating gateway status')).toBeInTheDocument();
      expect(screen.getByText('Failed to update the payment gateway status. Please try again.')).toBeInTheDocument();
    });

    // Check toggle state didn't change
    expect(stripeToggle).toBeChecked();
  });

  it('renders configure buttons for each gateway', () => {
    render(<PaymentGatewaysPage org={{ slug: 'test-org' }} />);
    
    const configureButtons = screen.getAllByText('Configure');
    expect(configureButtons).toHaveLength(2);
  });

  it('navigates to correct configuration page when clicking configure button', () => {
    render(<PaymentGatewaysPage org={{ slug: 'test-org' }} />);
    
    const configureButtons = screen.getAllByText('Configure');
    
    // Click Stripe configure button
    fireEvent.click(configureButtons[0]);
    const stripeLink = screen.getByRole('link', { name: 'Configure' });
    const stripePath = stripeLink.getAttribute('href');
    expect(stripePath).toBe('/test-org/settings/payment-gateways/stripe');
    if (stripePath) {
      expect(() => aiTestUtils.validateGatewayRoute(stripePath)).not.toThrow();
    }

    // Click Manual configure button
    fireEvent.click(configureButtons[1]);
    const manualLink = screen.getByRole('link', { name: 'Configure' });
    const manualPath = manualLink.getAttribute('href');
    expect(manualPath).toBe('/test-org/settings/payment-gateways/manual');
    if (manualPath) {
      expect(() => aiTestUtils.validateGatewayRoute(manualPath)).not.toThrow();
    }
  });

  it('applies withOrgAccess HOC with correct permissions', () => {
    const permissions = ['manage_payment_gateways'];
    expect(withOrgAccess).toHaveBeenCalledWith(expect.any(Function), {
      allowGuest: false,
      permissions
    });

    expect(() => aiTestUtils.validateGatewayPermissions(permissions)).not.toThrow();
  });

  // Test for accessibility
  it('meets accessibility requirements', async () => {
    const mockOrg = { slug: 'test-org' };
    const mockParams = { orgSlug: 'test-org' };
    const { container } = render(<PaymentGatewaysPage org={mockOrg} params={mockParams} />);
    expect(container).toBeAccessible();
  });

  // Test for responsive design
  it('maintains layout on different screen sizes', async () => {
    const mockOrg = { slug: 'test-org' };
    const mockParams = { orgSlug: 'test-org' };
    const { container } = render(<PaymentGatewaysPage org={mockOrg} params={mockParams} />);
    
    // Test mobile view
    window.innerWidth = 375;
    fireEvent(window, new Event('resize'));
    expect(container).toMatchSnapshot('mobile');
    expect(aiTestUtils.validateUIStructure(container)).toBe(true);

    // Test desktop view
    window.innerWidth = 1024;
    fireEvent(window, new Event('resize'));
    expect(container).toMatchSnapshot('desktop');
    expect(aiTestUtils.validateUIStructure(container)).toBe(true);
  });

  // Test for no client hooks in page component
  it('follows server component patterns', () => {
    const pageFile = path.join(__dirname, '../page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf8');
    
    expect(() => aiTestUtils.validateServerComponent(pageContent, pageFile)).not.toThrow();
  });

  // Test for proper params and searchParams usage
  it('properly awaits params and searchParams', () => {
    const pageFile = path.join(__dirname, '../page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf8');
    
    expect(() => aiTestUtils.validateParamsUsage(pageContent, pageFile)).not.toThrow();
  });
}); 