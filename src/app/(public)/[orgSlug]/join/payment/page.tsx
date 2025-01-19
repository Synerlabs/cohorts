import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { withOrgAccess, OrgAccessHOCProps } from "@/lib/hoc/org";
import { getUserMembership } from "@/services/join.service";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

async function PaymentPage({ org, user }: OrgAccessHOCProps) {
  if (!user) {
    redirect(`/@${org.slug}/join`);
  }

  const userMembership = await getUserMembership(user.id, org.id);
  
  // Redirect if:
  // 1. No membership exists
  // 2. Membership is rejected
  // 3. Membership is not approved yet
  // 4. Membership is already active
  if (!userMembership || 
      userMembership.rejected_at || 
      !userMembership.approved_at || 
      userMembership.is_active) {
    redirect(`/@${org.slug}/join`);
  }

  return (
    <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>
            Complete your payment to join {org.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="font-medium mb-2">Membership Details</h3>
            <div className="text-sm text-muted-foreground">
              <p>Tier: {userMembership.membership.name}</p>
              <p>Price: ${userMembership.membership.price}</p>
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2">Payment Information</h3>
            <p className="text-sm text-muted-foreground">
              Your payment will be processed securely. Once completed, your membership will be activated immediately.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" size="lg">
            <CreditCard className="mr-2 h-4 w-4" />
            Pay ${userMembership.membership.price}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 

export default withOrgAccess(PaymentPage);