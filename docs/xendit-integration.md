# Xendit Payment Gateway Integration Guide

## Overview

This guide outlines how to implement Xendit as a payment gateway with payment splitting functionality, following the same patterns established with our Stripe Connect implementation. The integration will allow platform organizations to collect payments through Xendit, with automatic splitting between the platform and the organization.

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Implementation Plan](#implementation-plan)
3. [Database Schema](#database-schema)
4. [Service Implementation](#service-implementation)
5. [Payment Splitting](#payment-splitting)
6. [Webhook Integration](#webhook-integration)
7. [UI Components](#ui-components)
8. [Testing](#testing)

## Current Architecture

Our payment system follows a service-oriented architecture with these key components:

- **Payment Gateways Service**: Manages available payment gateways for each organization
- **Payment Services**: Implements gateway-specific functionality (StripePaymentService, ManualPaymentService)
- **Payment Processor Service**: Unified service that processes payments regardless of source
- **Order Service**: Manages orders and their statuses
- **Membership Activation Service**: Handles membership activation based on successful payments

The system implements SOLID principles:
- **S**ingle Responsibility: Each service has a specific purpose
- **O**pen/Closed: Services are extensible without modification
- **L**iskov Substitution: Services implement common interfaces
- **I**nterface Segregation: Interfaces are specific to their use cases
- **D**ependency Inversion: High-level modules don't depend on low-level modules

## Implementation Plan

1. **Research Xendit APIs**: Understand Xendit Direct and its payment splitting capabilities
2. **Database Schema Updates**: Create tables for Xendit-specific data
3. **Service Implementation**: Create XenditPaymentService implementing the PaymentService interface
4. **Connected Account Flow**: Implement account connection and management
5. **Payment Processing**: Implement payment creation with fund splitting
6. **Webhook Handling**: Create webhook endpoint for payment status updates
7. **UI Integration**: Add Xendit to payment gateway options
8. **Testing**: Verify the complete payment flow

## Database Schema

### Required Tables

1. Add Xendit to existing payment gateways table:
```sql
INSERT INTO group_payment_gateway_types (id, name, display_name)
VALUES ('xendit', 'xendit', 'Xendit');
```

2. Create Xendit connected accounts table:
```sql
CREATE TABLE IF NOT EXISTS "public"."xendit_connected_accounts" (
    "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    "org_id" uuid REFERENCES organizations(id) ON DELETE CASCADE,
    "account_id" text UNIQUE NOT NULL,
    "is_active" boolean DEFAULT false,
    "charges_enabled" boolean DEFAULT false,
    "payouts_enabled" boolean DEFAULT false,
    "has_external_account" boolean DEFAULT false,
    "requirements_status" jsonb DEFAULT '{}'::jsonb,
    "capabilities_status" jsonb DEFAULT '{}'::jsonb,
    "verification_status" jsonb DEFAULT '{}'::jsonb,
    "disabled_reason" text,
    "requirements_due_date" timestamptz,
    "last_synced_at" timestamptz,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);
```

3. Create Xendit payments table:
```sql
CREATE TABLE IF NOT EXISTS "public"."xendit_payments" (
    "payment_id" uuid PRIMARY KEY REFERENCES payments(id) ON DELETE CASCADE,
    "xendit_invoice_id" text UNIQUE NOT NULL,
    "xendit_status" text NOT NULL,
    "payment_method" text,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);
```

### Update payment_gateways table
```sql
-- Ensure xendit is added to allowed payment types
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'xendit';
```

## Service Implementation

### 1. Create XenditPaymentService Class

Implement the PaymentService interface for Xendit:

```typescript
import { PaymentService } from './payment-service.interface';
import { Payment, CreateXenditPaymentDTO } from '@/lib/types/payment';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { XenditProvider } from '@/providers/xendit.provider';
import { OrderService } from '../order.service';

export class XenditPaymentService implements PaymentService {
  private supabase;
  private provider;

  constructor() {
    this.supabase = createServiceRoleClient();
    this.provider = new XenditProvider();
  }

  async createPayment(data: CreateXenditPaymentDTO): Promise<Payment> {
    // Create a Xendit invoice
    const result = await this.provider.createInvoice({
      amount: data.amount,
      currency: data.currency,
      externalId: data.orderId,
      description: `Payment for Order #${data.orderId}`,
      customerId: data.userId,
      successRedirectUrl: data.successUrl,
      failureRedirectUrl: data.failureUrl,
      // Add payment splitting details
      forUserId: data.orgId, // Xendit Direct business ID
      fees: [{
        type: 'platform-fee',
        value: Math.round((data.amount * 5) / 100), // 5% platform fee
      }]
    });

    // Create payment record in database
    const { data: payment, error: paymentError } = await this.supabase
      .from('payments')
      .insert({
        order_id: data.orderId,
        user_id: data.userId,
        group_id: data.orgId,
        type: 'xendit',
        amount: data.amount,
        currency: data.currency,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Create xendit payment record
    const { error: xenditPaymentError } = await this.supabase
      .from('xendit_payments')
      .insert({
        payment_id: payment.id,
        xendit_invoice_id: result.id,
        xendit_status: result.status
      });

    if (xenditPaymentError) {
      throw new Error(`Failed to create xendit payment: ${xenditPaymentError.message}`);
    }

    return this.mapPayment(payment);
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment> {
    const { data: updated, error } = await this.supabase
      .from('payments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    return this.mapPayment(updated);
  }

  async getPayment(id: string): Promise<Payment | null> {
    const { data, error } = await this.supabase
      .from('payments')
      .select(`
        *,
        xendit_payments(*)
      `)
      .eq('id', id)
      .eq('type', 'xendit')
      .single();

    if (error) return null;
    return this.mapPayment(data);
  }

  async approvePayment(id: string, notes?: string): Promise<Payment> {
    // First get the payment to get the order ID
    const { data: payment, error: getError } = await this.supabase
      .from('payments')
      .select('order_id')
      .eq('id', id)
      .single();

    if (getError || !payment) {
      throw new Error(`Failed to get payment: ${getError?.message}`);
    }

    // Update payment status to paid
    const updatedPayment = await this.updatePayment(id, { status: 'paid', notes });

    // Update order status based on all payments
    await OrderService.updateOrderStatusFromPayments(payment.order_id);

    return updatedPayment;
  }

  private mapPayment(data: any): Payment {
    // Transform database payment object to application Payment type
    return {
      id: data.id,
      orderId: data.order_id,
      userId: data.user_id,
      groupId: data.group_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      type: data.type,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      metadata: data.xendit_payments ? {
        xenditInvoiceId: data.xendit_payments.xendit_invoice_id,
        xenditStatus: data.xendit_payments.xendit_status,
        paymentMethod: data.xendit_payments.payment_method
      } : {}
    };
  }
}
```

### 2. Create Xendit Provider

```typescript
import { Xendit } from 'xendit-node';

export class XenditProvider {
  private xendit;
  private invoice;

  constructor() {
    this.xendit = new Xendit({
      secretKey: process.env.XENDIT_SECRET_KEY!
    });
    this.invoice = this.xendit.Invoice;
  }

  async createInvoice(params: XenditInvoiceParams) {
    try {
      return await this.invoice.createInvoice({
        externalId: params.externalId,
        amount: params.amount,
        description: params.description,
        currency: params.currency,
        customer: {
          given_names: params.customerName || 'Customer',
          email: params.customerEmail || 'customer@example.com',
        },
        successRedirectUrl: params.successRedirectUrl,
        failureRedirectUrl: params.failureRedirectUrl,
        paymentMethods: params.paymentMethods || ['CREDIT_CARD', 'VIRTUAL_ACCOUNT', 'EWALLET'],
        forUserId: params.forUserId,
        fees: params.fees
      });
    } catch (error) {
      console.error('Error creating Xendit invoice:', error);
      throw new Error(`Failed to create Xendit invoice: ${error.message}`);
    }
  }

  async getInvoice(invoiceId: string) {
    try {
      return await this.invoice.getInvoice({ id: invoiceId });
    } catch (error) {
      console.error('Error getting Xendit invoice:', error);
      throw new Error(`Failed to get Xendit invoice: ${error.message}`);
    }
  }

  mapProviderStatus(xenditStatus: string): string {
    // Map Xendit status to our application status
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
}
```

## Payment Splitting

Xendit offers payment splitting via its Direct feature. Key concepts:

1. **Business Onboarding**:
   - Organizations need to onboard with Xendit Direct
   - Store business IDs in `xendit_connected_accounts` table

2. **Fee Configuration**:
   - Platform fee is specified during invoice creation
   - Example: 5% platform fee calculated on the total amount

3. **Implementation**:
   - When creating an invoice, specify `forUserId` (the connected business ID)
   - Add platform fee configuration in the `fees` array

```typescript
// Example of configuring payment splitting with Xendit
const invoice = await xenditProvider.createInvoice({
  // ... other invoice details
  forUserId: connectedAccount.account_id, // Xendit business ID
  fees: [{
    type: 'platform-fee',
    value: Math.round((amount * platformFeePercent) / 100),
  }]
});
```

## Webhook Integration

Create a webhook handler for Xendit payment updates:

```typescript
// src/app/api/webhooks/xendit/route.ts
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { NextResponse } from 'next/server';
import { PaymentProcessorService } from '@/services/payment/payment-processor.service';
import * as crypto from 'crypto';

// Verify Xendit webhook signature
function verifySignature(payload: string, signature: string, webhookKey: string): boolean {
  const hmac = crypto.createHmac('sha256', webhookKey);
  const digest = hmac.update(payload).digest('hex');
  return signature === digest;
}

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-callback-token') || '';
    
    // Verify signature
    if (!verifySignature(payload, signature, process.env.XENDIT_WEBHOOK_KEY!)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }
    
    const data = JSON.parse(payload);
    
    // Process based on event type
    if (data.event === 'invoice.paid') {
      const invoiceId = data.data.id;
      const supabase = await createServiceRoleClient();
      
      // Find the payment record
      const { data: xenditPayment, error: xenditError } = await supabase
        .from('xendit_payments')
        .select('payment_id')
        .eq('xendit_invoice_id', invoiceId)
        .single();
      
      if (xenditError || !xenditPayment) {
        console.error('Failed to find Xendit payment:', xenditError);
        return new NextResponse('Payment not found', { status: 404 });
      }
      
      // Get the payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, order_id')
        .eq('id', xenditPayment.payment_id)
        .single();
      
      if (paymentError || !payment) {
        console.error('Failed to find payment:', paymentError);
        return new NextResponse('Payment not found', { status: 404 });
      }
      
      // Update xendit payment status
      const { error: updateXenditError } = await supabase
        .from('xendit_payments')
        .update({ 
          xendit_status: data.data.status,
          payment_method: data.data.payment_method,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', payment.id);
      
      if (updateXenditError) {
        console.error('Failed to update xendit payment:', updateXenditError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      // Update payment status to paid
      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({ 
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);
      
      if (updatePaymentError) {
        console.error('Failed to update payment status:', updatePaymentError);
        return new NextResponse('Failed to update payment', { status: 500 });
      }
      
      // Process the order and its suborders
      try {
        await PaymentProcessorService.processPayment(payment.order_id);
        console.log('Order processed successfully:', payment.order_id);
      } catch (error) {
        console.error('Failed to process order:', error);
        return new NextResponse('Failed to process order', { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Xendit webhook:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
```

## UI Components

1. **Xendit Account Connection UI**:
   - Create a connection page in settings
   - Implement OAuth flow for Xendit

2. **Xendit Payment Form**:
   - Create payment form component
   - Support Xendit redirect or embedded payment

3. **Payment Gateway Selection UI**:
   - Add Xendit to available payment methods
   - Show when organization has active Xendit account

Example Xendit payment form component:
```tsx
import { useXenditForm } from '@/hooks/use-xendit-form';

export function XenditPaymentForm({ 
  orderId,
  orgId,
  expectedAmount,
  currency
}: XenditPaymentFormProps) {
  const { isLoading, checkoutUrl, error, initPayment } = useXenditForm();
  
  const handlePay = async () => {
    await initPayment({
      orderId,
      orgId,
      amount: expectedAmount,
      currency
    });
  };
  
  if (checkoutUrl) {
    window.location.href = checkoutUrl;
    return <div>Redirecting to Xendit...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium">Total Amount</div>
        <div className="font-bold">{formatCurrency(expectedAmount, currency)}</div>
      </div>
      
      <Button 
        onClick={handlePay} 
        className="w-full" 
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Pay with Xendit"}
      </Button>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

## Testing

1. **Unit Testing**:
   - Test Xendit service methods
   - Mock API responses

2. **Integration Testing**:
   - Test payment flow with test accounts
   - Verify webhook handling

3. **Acceptance Testing**:
   - Complete end-to-end payment flow
   - Test payment splitting
   - Verify membership activation

4. **Setting Up Test Environment**:
   - Create Xendit test account
   - Configure webhooks for test environment
   - Use test payment methods

## Resources

- [Xendit API Documentation](https://developers.xendit.co/api-reference/)
- [Xendit Direct Documentation](https://developers.xendit.co/products/direct/)
- [Xendit Node.js SDK](https://github.com/xendit/xendit-node)

## Next Steps

1. Research Xendit API specifics for business onboarding
2. Create database migration scripts
3. Implement XenditPaymentService
4. Add webhook endpoint
5. Create UI components
6. Test with Xendit test environment 