import { Xendit } from 'xendit-node';

export interface XenditInvoiceParams {
  externalId: string;
  amount: number;
  description: string;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  paymentMethods?: string[];
  forUserId?: string;
  fees?: { type: string; value: number }[];
}

/**
 * XenditProvider
 * 
 * Service for interacting with the Xendit API
 */
export class XenditProvider {
  private xendit;
  private invoice;

  constructor() {
    this.xendit = new Xendit({
      secretKey: process.env.XENDIT_SECRET_KEY!
    });
    this.invoice = this.xendit.Invoice;
  }

  /**
   * Create a new invoice in Xendit
   */
  async createInvoice(params: XenditInvoiceParams) {
    try {
      // The Xendit Invoice API expects data property with invoice details
      return await this.invoice.createInvoice({
        data: {
          externalId: params.externalId,
          amount: params.amount,
          description: params.description,
          currency: params.currency,
          customer: params.customerName || params.customerEmail ? {
            givenNames: params.customerName || 'Customer',
            email: params.customerEmail || 'customer@example.com',
          } : undefined,
          successRedirectUrl: params.successRedirectUrl,
          failureRedirectUrl: params.failureRedirectUrl,
          paymentMethods: params.paymentMethods || ['CREDIT_CARD', 'VIRTUAL_ACCOUNT', 'EWALLET'],
        },
        forUserId: params.forUserId
      });
    } catch (error: any) {
      console.error('Error creating Xendit invoice:', error);
      throw new Error(`Failed to create Xendit invoice: ${error.message}`);
    }
  }

  /**
   * Retrieve invoice details
   */
  async getInvoice(invoiceId: string) {
    try {
      return await this.invoice.getInvoiceById({ 
        invoiceId: invoiceId
      });
    } catch (error: any) {
      console.error('Error getting Xendit invoice:', error);
      throw new Error(`Failed to get Xendit invoice: ${error.message}`);
    }
  }

  /**
   * Map Xendit status to our application payment status
   */
  mapProviderStatus(xenditStatus: string): string {
    switch (xenditStatus) {
      case 'PENDING':
        return 'pending';
      case 'PAID':
        return 'paid';
      case 'SETTLED':
        return 'paid';
      case 'EXPIRED':
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get a connected business account from Xendit
   */
  async getConnectedAccount(accountId: string) {
    try {
      // This is a placeholder - Xendit API endpoint for business details would be used here
      // Example: return await this.xendit.ConnectedAccounts.getAccount(accountId);
      // Actual implementation will depend on Xendit's API for Direct businesses
      return {
        id: accountId,
        status: 'ACTIVE',
        capabilities: {
          cards: 'ACTIVE',
          virtualAccounts: 'ACTIVE'
        }
      };
    } catch (error: any) {
      console.error('Error getting Xendit connected account:', error);
      throw new Error(`Failed to get Xendit connected account: ${error.message}`);
    }
  }

  /**
   * Create a connected account onboarding link
   */
  async createAccountOnboardingLink(redirectUrl: string, metadata: any = {}) {
    try {
      // This is a placeholder - Xendit API endpoint for creating onboarding links would be used here
      // Example: return await this.xendit.ConnectedAccounts.createOnboardingLink({ redirect_url: redirectUrl, metadata });
      // Actual implementation will depend on Xendit's API for Direct businesses
      return {
        url: `https://dashboard.xendit.co/register?redirect=${encodeURIComponent(redirectUrl)}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error: any) {
      console.error('Error creating Xendit onboarding link:', error);
      throw new Error(`Failed to create Xendit onboarding link: ${error.message}`);
    }
  }
} 