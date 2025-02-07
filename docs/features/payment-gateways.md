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