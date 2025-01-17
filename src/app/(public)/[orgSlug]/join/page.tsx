import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MembershipSelection } from "./components/MembershipSelection";
import { getOrgBySlug } from "@/services/org.service";
import { getMemberships } from "@/services/membership.service";
import { getCurrentUser } from "@/services/user.service";
import { getUserMembership } from "@/services/join.service";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CamelizedGroup = Camelized<Tables<"group">>;

async function getMembershipData(orgSlug: string) {
  const { data, error } = await getOrgBySlug(orgSlug);
  if (error || !data) redirect('/404');

  const memberships = await getMemberships({ orgId: data.id });
  return { org: data as CamelizedGroup, memberships };
}

export default async function JoinPage({ params }: { params: { orgSlug: string } }) {
  const { data, error } = await getCurrentUser();
  const { org, memberships } = await getMembershipData(params.orgSlug);

  if (error || !data?.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Please log in to join {org.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You must be logged in to join this organization.</p>
        </CardContent>
      </Card>
    );
  }

  const userMembership = await getUserMembership(data.user.id, org.id);

  // If user has an active membership, redirect to org page
  if (userMembership?.is_active) {
    redirect(`/@${params.orgSlug}`);
  }

  // If user has a pending application (not rejected)
  if (userMembership && !userMembership.rejected_at && !userMembership.approved_at) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Application</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your application to join {org.name} is currently under review.</p>
        </CardContent>
      </Card>
    );
  }

  // If user has a rejected membership or no membership, show membership selection
  return (
    <div className="space-y-4">
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
  );
}
