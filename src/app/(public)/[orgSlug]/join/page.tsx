import { redirect } from "next/navigation";
import { MembershipSelection } from "./components/MembershipSelection";
import { getOrgBySlug } from "@/services/org.service";
import { getMemberships } from "@/services/membership.service";
import { getCurrentUser } from "@/services/user.service";
import { getUserMembership } from "@/services/join.service";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { MembershipActivationType } from "@/lib/types/membership";
import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CamelizedGroup = Camelized<Tables<"group">>;

async function getMembershipData(orgId: string) {
  const memberships = await getMemberships({ orgId });
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

  const userMembership = await getUserMembership(data.user.id, org.id);

  // If user has an active membership, redirect to org page
  if (userMembership?.is_active) {
    redirect(`/@${org.slug}`);
  }

  // If user has a pending application
  if (userMembership && !userMembership.rejected_at) {
    // If application is approved and requires payment, redirect to payment page
    if (userMembership.approved_at && 
      (userMembership.membership.activation_type === MembershipActivationType.PAYMENT_REQUIRED ||
       userMembership.membership.activation_type === MembershipActivationType.REVIEW_THEN_PAYMENT)) {
      redirect(`/@${org.slug}/join/payment`);
    }

    // If application is pending review
    if (!userMembership.approved_at) {
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
  }

  // If user has a rejected membership or no membership, show membership selection
  return (
    <div className="container max-w-4xl py-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Join {org.name}</h1>
          <p className="text-sm text-muted-foreground">Select a membership type to join this organization.</p>
        </div>

        {userMembership?.rejected_at && (
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