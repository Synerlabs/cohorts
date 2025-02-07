import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { PaymentGatewaysList } from './_components/payment-gateways-list';

async function PaymentGatewaysPage({ org, params }: OrgAccessHOCProps) {
  // Await params to follow Next.js best practices
  const { orgSlug } = await params;

  return (
    <div>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Payment Gateways</h1>
          <p className="text-muted-foreground">Configure payment methods for your organization</p>
        </div>

        <PaymentGatewaysList orgSlug={org.slug} />
      </div>
    </div>
  );
}

export default withOrgAccess(PaymentGatewaysPage, {
  allowGuest: false,
  permissions: ['manage_payment_gateways']
});

