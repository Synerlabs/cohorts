import { Icons } from '@/components/icons';

export interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Icons;
  isConfigured?: boolean;
  status?: PaymentGatewayStatus;
  enabled: boolean;
}

export type PaymentGatewayStatus = 'unconfigured' | 'configured' | 'disabled' | 'error';

export interface PaymentGatewayConfig {
  stripeConnectAccountId?: string;
  manualPaymentInstructions?: string;
  allowedCurrencies?: string[];
  webhookSecret?: string;
  testMode?: boolean;
  enabled?: boolean;
} 