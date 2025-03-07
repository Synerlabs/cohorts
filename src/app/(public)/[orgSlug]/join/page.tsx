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
import { CreditCard, ChevronRight, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { IMembershipTierProduct } from "@/lib/types/product";
import { getUserMembership } from "@/services/join.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CamelizedGroup = Camelized<Tables<"group">>;

async function getMembershipData(orgId: string, isDeleted = false): Promise<IMembershipTierProduct[]> {
  const memberships = await ProductService.getMembershipTiers(orgId);
  return memberships;
}

async function JoinPage({ org, params }: OrgAccessHOCProps) {
  const _params = await params;
  const { data, error } = await getCurrentUser();
  const memberships = await getMembershipData(org.id);

  if (error || !data?.user) {
    return (
      <div className="container max-w-5xl py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Join {org.name}</h1>
            <p className="text-base text-muted-foreground mb-8">Create an account to join this organization and access member benefits.</p>
          </div>
          <Card className="shadow-lg border-muted/60">
            <CardHeader>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>
                Fill out the form below to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegistrationForm orgId={org.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // First check for active membership
  const membership = await getUserMembership({ userId: data.user.id, groupId: org.id });
  
  // If user has an active membership, redirect to org page
  if (membership?.is_active) {
    redirect(`/@${org.slug}`);
  }

  // Get user's applications
  const applications = await getUserMembershipApplications(data.user.id, org.id);
  const latestApplication = applications[0];

  // If user has a pending application
  if (latestApplication && !latestApplication.rejected_at) {
    // If application is approved and requires payment
    if (latestApplication.status === "pending_payment") {
      return (
        <div className="container max-w-5xl py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Complete Your Membership</h1>
              <p className="text-base text-muted-foreground mb-8">
                Your application has been approved. Complete the payment to activate your membership.
              </p>
            </div>
            <Card className="shadow-lg border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Membership Details</CardTitle>
                <CardDescription>
                  One step away from becoming a member
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Membership Tier</span>
                    <span className="font-semibold">{latestApplication.product.name}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Price</span>
                    <span className="font-semibold">${latestApplication.product.price ? (latestApplication.product.price / 100).toFixed(2) : '0.00'}</span>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Payment Required</h4>
                      <p className="text-sm">
                        Please complete your payment to finalize your membership.
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button className="w-full" size="lg" asChild>
                  <Link href={`/@${org.slug}/join/payments?applicationId=${latestApplication.id}`}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Complete Payment (${latestApplication.product.price ? (latestApplication.product.price / 100).toFixed(2) : '0.00'})
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // If application is pending review
    if (latestApplication.status === "pending") {
      return (
        <div className="container max-w-5xl py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="w-full max-w-lg space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Application Under Review</h1>
              <p className="text-base text-muted-foreground mb-8">
                Your application to join {org.name} is currently being reviewed.
              </p>
            </div>
            <Card className="shadow-lg border-amber-200">
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-center justify-center">
                  <div className="rounded-full bg-amber-100 p-3">
                    <Clock className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-medium">Pending Review</h2>
                  <p className="text-muted-foreground">
                    Our team is reviewing your application. You'll receive an email when a decision has been made.
                  </p>
                </div>
                
                <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-amber-800">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium mb-1">Application Details</h4>
                      <div className="text-sm space-y-2">
                        <div className="flex justify-between items-center text-sm mt-2">
                          <span>Membership Tier:</span>
                          <span className="font-medium">{latestApplication.product.name}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span>Submitted:</span>
                          <span className="font-medium">{new Date(latestApplication.created_at).toDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-center text-muted-foreground text-sm">
                  If you have any questions, please contact the organization administrator.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  }

  // Show membership selection if:
  // 1. User has no active membership
  // 2. No pending applications
  // 3. Previous application was rejected (or no previous applications)
  return (
    <div className="container max-w-5xl py-12 min-h-[calc(100vh-4rem)]">
      <div className="w-full space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Join {org.name}</h1>
          <p className="text-base text-muted-foreground mb-8">
            Select a membership type below to join this organization and access member benefits.
          </p>
        </div>

        {latestApplication?.rejected_at && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg max-w-2xl mx-auto mb-8">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">Previous Application Rejected</h4>
                <p className="text-sm">
                  Your previous application was rejected. You may reapply with a different membership type below.
                </p>
              </div>
            </div>
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