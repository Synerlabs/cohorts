# Payment Gateways Feature Documentation

## Overview
The Payment Gateways page allows organization administrators to configure and manage different payment methods for their organization. This feature is crucial for organizations to control how they receive payments from their members or customers.

## Location
- Path: `/[orgSlug]/settings/payment-gateways`
- Component: `src/app/(authenticated)/[orgSlug]/(org-pages)/settings/payment-gateways/page.tsx`

## Access Control
- Protected by `withOrgAccess` HOC
- Required Permission: `manage_payment_gateways`
- Guest Access: Not allowed

## Available Payment Gateways

### 1. Stripe Connect
- **ID**: `stripe`
- **Purpose**: Process payments through Stripe's payment infrastructure
- **Configuration Path**: `/[orgSlug]/settings/payment-gateways/stripe`
- **Features**:
  - Connect organization's Stripe account
  - Process credit card payments
  - Handle international transactions
  - Automated payment reconciliation

### 2. Manual Payments
- **ID**: `manual`
- **Purpose**: Manually track and mark payments as completed
- **Configuration Path**: `/[orgSlug]/settings/payment-gateways/manual`
- **Features**:
  - Mark payments as completed manually
  - Track offline payments
  - Suitable for bank transfers or cash payments

## States and Configuration

Each payment gateway can be in one of the following states:
1. **Unconfigured**: Default state, gateway is available but not set up
2. **Configured**: Gateway is set up and ready to use
3. **Disabled**: Gateway is intentionally turned off
4. **Error**: Gateway is in an error state (e.g., expired credentials)

## UI Components
- Card layout for each payment gateway
- Gateway icon and description
- Configuration button
- Status indicator (to be implemented)

## Required Database Schema Updates
```sql
CREATE TYPE payment_gateway_status AS ENUM ('unconfigured', 'configured', 'disabled', 'error');

CREATE TABLE IF NOT EXISTS org_payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    gateway_id TEXT NOT NULL,
    status payment_gateway_status DEFAULT 'unconfigured',
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_org_payment_gateways_org_id ON org_payment_gateways(org_id);
```

## API Endpoints

### Get Organization Payment Gateways
```typescript
GET /api/organizations/{orgSlug}/payment-gateways
Response: {
  gateways: Array<{
    id: string;
    name: string;
    status: PaymentGatewayStatus;
    config: Record<string, any>;
  }>
}
```

### Update Gateway Status
```typescript
PATCH /api/organizations/{orgSlug}/payment-gateways/{gatewayId}
Body: {
  status: PaymentGatewayStatus;
  config?: Record<string, any>;
}
```

## Error Handling
1. Invalid configuration attempts should show appropriate error messages
2. Network errors during configuration should be gracefully handled
3. Permission denied errors should redirect to the appropriate error page

## Future Improvements
1. Add support for additional payment gateways
2. Implement webhook handling for gateway status updates
3. Add payment gateway analytics and reporting
4. Implement automatic gateway health checks

## Security Considerations
1. All gateway credentials must be encrypted at rest
2. Access to gateway configuration must be logged
3. Failed configuration attempts should be rate limited
4. Sensitive gateway information should be masked in logs

## Testing Requirements
1. Unit tests for gateway components
2. Integration tests for gateway configuration
3. Permission-based access control tests
4. Error handling and edge case tests
5. API endpoint tests

## Payment Flows and Membership Activation

The system supports both automatic and manual payment flows for membership activation:

### Automatic Payments (e.g., Stripe)
- User pays online via Stripe or other integrated gateway.
- Payment is instantly validated by the system.
- If successful, the membership application is approved and the membership is activated immediately.
- No admin intervention is required.

### Manual Payments (e.g., Bank Transfer, Cash, Check)
- User selects manual payment and uploads proof (e.g., bank transfer receipt).
- Payment record is created with status `pending`.
- Admin must review the payment in the Payments Dashboard.
  - If approved: payment status is set to `approved`, application is approved, and membership is activated.
  - If rejected: payment status is set to `rejected`, application remains inactive.

#### Summary Table
| Flow Type         | Payment Validation         | Admin Involvement | Membership Activation Timing         |
|-------------------|---------------------------|-------------------|--------------------------------------|
| Automatic         | System-verified (instant) | None              | Immediately after payment            |
| Manual            | Admin-reviewed            | Required          | After admin approval of payment      |

#### Manual Payment Workflow (Summary)
1. User submits application and selects manual payment.
2. User uploads proof of payment.
3. Admin reviews and approves/rejects payment.
4. If approved, membership is activated; if rejected, application remains inactive.

## Suborder Processing and Payment Flows

With the introduction of suborder processing and the suborder processor registry, the workflow for handling payments and activating memberships has changed:

- **Payment approval (manual or automatic) now only updates the payment and order status.**
- **Membership activation is triggered by processing the relevant suborder (type: 'membership') via the suborder processor registry.**
- If the suborder is not processed, the membership will NOT be activated, even if payment is approved.

### Suborder Processors
- Suborder processors are functions registered for each suborder type (e.g., membership, product, event).
- The registry (`suborderProcessorRegistry`) maps suborder types to their processors.
- **Currently, most processors are placeholders and must be implemented to handle the actual business logic for each suborder type.**

### Summary Table
| Action                | Effect (Old Behavior)         | Effect (With Suborder Registry)         |
|-----------------------|------------------------------|-----------------------------------------|
| Approve payment       | May directly activate membership | Only updates payment/order status    |
| Process suborder      | N/A                          | Activates membership (if type=membership) |

### Important Notes
- If you want membership activation to happen automatically after payment approval, you must ensure the membership suborder is processed at that point.
- The current registry-based design decouples payment approval from membership activation for greater flexibility and extensibility. 