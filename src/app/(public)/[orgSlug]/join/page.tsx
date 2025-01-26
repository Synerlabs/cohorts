import { redirect } from "next/navigation";
import { MembershipSelection } from "./components/MembershipSelection";
import { getOrgBySlug } from "@/services/org.service";
import { ProductService } from "@/services/product.service";
import { getUserMembershipApplications } from "@/services/applications.service";
import { getCurrentUser } from "@/services/user.service";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import Link from "next/link";
import { IMembershipTierProduct } from "@/lib/types/product";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CamelizedGroup = Camelized<Tables<"group">>;

async function getMembershipData(orgId: string): Promise<IMembershipTierProduct[]> {
  const memberships = await ProductService.getMembershipTiers(orgId);
  return memberships;
}

async function JoinPage({ org, params }: OrgAccessHOCProps) {
  const { data, error } = await getCurrentUser();
  const memberships = await getMembershipData(org.id);

  if (error || !data?.user) {
    return (
      <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Join {org.name}</h1>
            <p className="text-sm text-muted-foreground mb-6">Create an account to join this organization.</p>
          </div>
          <div className="flex justify-center">
            <RegistrationForm orgId={org.id} />
          </div>
        </div>
      </div>
    );
  }

  // Get user's applications
  const applications = await getUserMembershipApplications(data.user.id, org.id);
  const latestApplication = applications[0];

  console.log("LATEST APPLICATION", latestApplication);
  // If user has an active application for this organization
  if (latestApplication && !latestApplication.rejected_at && latestApplication.group_id === org.id) {
    // If application is approved and requires payment
    if (latestApplication.status === "pending_payment") {
      return (
        <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Complete Your Membership</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your application has been approved. Complete the payment to activate your membership.
              </p>
            </div>
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <div className="space-y-2">
                <h2 className="font-medium">Membership Details</h2>
                <div className="text-sm text-muted-foreground">
                  <p>Tier: {latestApplication.product.name}</p>
                  <p>Price: ${latestApplication.product.price ? latestApplication.product.price / 100 : 0}</p>
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={`/@${org.slug}/join/payments`}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Complete Payment (${latestApplication.product.price ? latestApplication.product.price / 100 : 0})
                </Link>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // If application is pending
    if (latestApplication.status === "pending") {
      return (
        <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-lg space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Pending Application</h1>
              <p className="text-sm text-muted-foreground">Your application to join {org.name} is currently under review.</p>
            </div>
          </div>
        </div>
      );
    }

    // If application is approved, redirect to org page
    if (latestApplication.status === "approved") {
      redirect(`/@${org.slug}`);
    }
  }

  // If user has a rejected membership or no membership, show membership selection
  return (
    <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Join {org.name}</h1>
          <p className="text-sm text-muted-foreground">Select a membership type to join this organization.</p>
        </div>

        {latestApplication?.rejected_at && (
          <div className="bg-destructive/10 p-4 rounded-lg text-center max-w-lg mx-auto">
            <h2 className="font-semibold text-destructive mb-2">Previous Application Rejected</h2>
            <p className="text-sm">Your previous application was rejected. You may reapply with a different membership type below.</p>
          </div>
        )}

        <MembershipSelection 
          memberships={memberships} 
          groupId={org.id} 
          userId={data.user.id} 
        />
      </div>
    </div>
  );
}

export default withOrgAccess(JoinPage, { allowGuest: true });