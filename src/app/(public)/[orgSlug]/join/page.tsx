import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipSelection } from "./components/MembershipSelection";
import { getOrgBySlug } from "@/services/org.service";
import { getMemberships } from "@/services/membership.service";
import { getCurrentUser } from "@/services/user.service";
import { getUserMembership } from "@/services/join.service";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { MembershipActivationType } from "@/lib/types/membership";

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
      <div className="container max-w-4xl py-6">
        <Card>
          <CardHeader>
            <CardTitle>Please log in to join {org.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You must be logged in to join this organization.</p>
          </CardContent>
        </Card>
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
        <div className="container max-w-4xl py-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Application</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Your application to join {org.name} is currently under review.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // If user has a rejected membership or no membership, show membership selection
  return (
    <div className="container max-w-4xl py-6">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Join {org.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Select a membership type to join this organization.</p>
          </CardContent>
        </Card>

        {userMembership?.rejected_at && (
          <Card>
            <CardHeader>
              <CardTitle>Previous Application Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Your previous application was rejected. You may reapply with a different membership type below.</p>
            </CardContent>
          </Card>
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