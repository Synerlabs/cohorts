import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock, Plus } from "lucide-react";
import { getUserMembership } from "@/services/join.service";
import { PaymentService } from "@/services/payment.service";
import { Payment } from "@/services/payment/types";
import { getCurrentUser } from "@/services/user.service";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

async function OrgHomePage({ org, user, isGuest }: OrgAccessHOCProps) {
  // Since we're not allowing guests, user will always be defined
  const membership = await getUserMembership(user!.id, org.id);

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-bold mb-4">Welcome to {org.slug}!</h1>
        <p className="text-gray-600 mb-8">Join us to access exclusive content and features.</p>
        <Button asChild>
          <Link href={`/${org.slug}/join`}>Join Now</Link>
        </Button>
      </div>
    );
  }

  // Only fetch pending payments for non-guest users
  const payments = await PaymentService.getPaymentsByOrgId(org.id);
  const pendingPayments = payments.filter(payment => payment.status === 'pending');
  const totalPendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Welcome to {org.slug}!</h1>
      
      {membership.status === 'pending_payment' && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-yellow-500" />
            <div>
              <h2 className="text-lg font-semibold">Complete Your Membership</h2>
              <p className="text-gray-600">Please complete your membership payment to access all features.</p>
            </div>
          </div>
          <Button asChild className="mt-4">
            <Link href={`/${org.slug}/join/payments`}>
              Pay {(membership.product.price / 100).toLocaleString(undefined, {
                style: 'currency',
                currency: 'USD'
              })}
            </Link>
          </Button>
        </Card>
      )}

      {pendingPayments.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Clock className="h-6 w-6 text-yellow-500" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold">Pending Payments</h2>
              <p className="text-gray-600">
                You have {pendingPayments.length} pending payment{pendingPayments.length > 1 ? 's' : ''} totaling {(totalPendingAmount / 100).toLocaleString(undefined, {
                  style: 'currency',
                  currency: pendingPayments[0].currency
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/${org.slug}/payments`}>View All</Link>
              </Button>
              <Button asChild>
                <Link href={`/${org.slug}/join/payments`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Payment
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default withOrgAccess(OrgHomePage);
