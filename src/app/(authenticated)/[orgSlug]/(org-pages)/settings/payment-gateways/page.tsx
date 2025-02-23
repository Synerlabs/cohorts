import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { PaymentGatewaysList } from './_components/payment-gateways-list';
import { permissions } from '@/lib/types/permissions';

async function PaymentGatewaysPage({ org, userPermissions }: OrgAccessHOCProps) {
  return (
    <div>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground">Configure payment methods for your organization</p>
        </div>

        <PaymentGatewaysList 
          orgSlug={org.slug} 
          userPermissions={userPermissions || []}
          groupId={org.id}
        />
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentGatewaysPage, {
  permissions: [permissions.paymentGateways.view],
  onAccessDenied: { action: 'error' }
});

