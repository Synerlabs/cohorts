import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserMembership } from "@/services/join.service";
import { CreditCard } from "lucide-react";
import { MembershipActivationType } from "@/lib/types/membership";

async function OrgHomePage({
  user,
  org,
  isGuest,
  params,
  searchParams,
}: OrgAccessHOCProps) {
  const userMembership = user ? await getUserMembership(user.id, org.id) : null;
  const hasPendingPayment = userMembership && 
    userMembership.status === "pending_payment" && 
    (userMembership.product.membership_tiers.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
     userMembership.product.membership_tiers.activation_type === MembershipActivationType.REVIEW_THEN_PAYMENT);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
        <p className="text-sm text-muted-foreground">
          {org.description}
        </p>
      </div>

      {hasPendingPayment && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Complete Your Membership</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Your application has been approved. Complete the payment of ${userMembership.product.price / 100} to activate your membership.
          </p>
          <Button asChild>
            <Link href={`/@${org.slug}/join/payment`}>
              <CreditCard className="mr-2 h-4 w-4" />
              Complete Payment (${userMembership.product.price / 100})
            </Link>
          </Button>
        </div>
      )}

      {isGuest && !hasPendingPayment && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Join {org.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You are currently viewing this organization as a guest. Join to access member features.
          </p>
          <Button asChild>
            <Link href={`/@${org.slug}/join/payments?applicationId=${userMembership?.id}`}>Join Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default withOrgAccess(OrgHomePage, { allowGuest: true });
