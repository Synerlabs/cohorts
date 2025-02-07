import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentGatewaysList } from '../payment-gateways-list';
import { aiTestUtils } from '@/lib/test-utils/ai-test-helper';
import fs from 'fs';
import path from 'path';

// Mock the server action
jest.mock('../../_actions/payment-gateway.action', () => ({
  updateGatewayStatus: jest.fn(() =>
    Promise.resolve({
      success: true,
      message: 'Successfully updated gateway status',
    })
  ),
}));

// Mock useToastStateAction
jest.mock('@/hooks/use-toast-state-action', () => ({
  useToastStateAction: (fn: any) => ({
    action: fn,
    isLoading: false,
  }),
}));

describe('PaymentGatewaysList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all payment gateways with enabled states', () => {
    const { container } = render(<PaymentGatewaysList orgSlug="test-org" />);
    
    expect(screen.getByText('Stripe')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
    expect(screen.getByText('Accept payments via Stripe Connect')).toBeInTheDocument();
    expect(screen.getByText('Manually mark payments as completed')).toBeInTheDocument();

    // Check enabled states
    expect(screen.getAllByText('Enabled')).toHaveLength(2);
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();

    // AI: Validate UI structure
    expect(aiTestUtils.validateUIStructure(container)).toBe(true);
  });

  it('uses server actions for mutations', () => {
    const componentFile = path.join(__dirname, '../payment-gateways-list.tsx');
    const componentContent = fs.readFileSync(componentFile, 'utf8');
    
    expect(() => aiTestUtils.validateMutationHandling(componentContent, componentFile)).not.toThrow();
  });

  it('uses useToastStateAction with server actions', () => {
    const componentFile = path.join(__dirname, '../payment-gateways-list.tsx');
    const componentContent = fs.readFileSync(componentFile, 'utf8');
    
    expect(() => aiTestUtils.validateToastStateActionUsage(componentContent, componentFile)).not.toThrow();
  });

  it('handles successful gateway toggle', async () => {
    render(<PaymentGatewaysList orgSlug="test-org" />);
    
    // Get Stripe gateway toggle
    const stripeToggle = screen.getByRole('switch', { name: /Enabled/i });
    expect(stripeToggle).toBeInTheDocument();
    expect(stripeToggle).toBeChecked();

    // Toggle Stripe gateway off
    fireEvent.click(stripeToggle);

    // Wait for state update
    await waitFor(() => {
      expect(stripeToggle).not.toBeChecked();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  it('renders configure buttons with correct links', () => {
    render(<PaymentGatewaysList orgSlug="test-org" />);
    
    const stripeLink = screen.getByRole('link', { name: 'Configure' });
    expect(stripeLink).toHaveAttribute('href', '/test-org/settings/payment-gateways/stripe');

    const manualLink = screen.getByRole('link', { name: 'Configure' });
    expect(manualLink).toHaveAttribute('href', '/test-org/settings/payment-gateways/manual');
  });
}); 