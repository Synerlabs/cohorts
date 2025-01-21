import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { withOrgAccess, OrgAccessHOCProps } from "@/lib/hoc/org";
import { ApplicationService } from "@/services/application.service";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { getCurrentUser } from "@/services/user.service";

async function PaymentPage({ org, user }: OrgAccessHOCProps) {
  if (!user) {
    redirect(`/@${org.slug}/join`);
  }

  const { data: currentUser } = await getCurrentUser();
  if (!currentUser?.user) throw new Error('User not found');

  // Get user's applications
  const applications = await ApplicationService.getUserMembershipApplications(user.id, org.id);
  const latestApplication = applications[0];
  
  // Redirect if:
  // 1. No application exists
  // 2. Application is rejected
  // 3. Application is not in pending_payment status
  if (!latestApplication || 
      latestApplication.rejected_at || 
      latestApplication.status !== 'pending_payment') {
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
              <p>Tier: {latestApplication.product_data?.name}</p>
              <p>Price: ${latestApplication.product_data?.price ? latestApplication.product_data.price / 100 : 0}</p>
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
            Pay ${latestApplication.product_data?.price ? latestApplication.product_data.price / 100 : 0}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 

export default withOrgAccess(PaymentPage);