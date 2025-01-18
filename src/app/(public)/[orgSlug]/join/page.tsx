import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { JoinOrgForm } from "./components/JoinOrgForm";
import { MembershipSelection } from "./components/MembershipSelection";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/utils/supabase/server";

async function getMemberships(groupId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('membership')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) throw error;
  return data;
}

async function JoinPage({ org, user, isGuest, userRoles, groupUser }: OrgAccessHOCProps) {
  if (!user) {
    return <RegistrationForm orgId={org.id} />;
  }

  if (isGuest) {
    const hasPendingRole = userRoles?.some(role => !role.isActive);
    const hasPendingGroupMembership = groupUser && !groupUser.isActive;

    if (hasPendingRole || hasPendingGroupMembership) {
      return (
        <Card className="w-[369px]">
          <CardHeader>
            <CardTitle className="text-xl">Pending Application</CardTitle>
            <CardDescription>
              You already have a pending application to join {org.name}. 
              Please wait for an administrator to review your request.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    const memberships = await getMemberships(org.id);
    
    if (memberships && memberships.length > 0) {
      return <MembershipSelection org={org} userId={user.id} memberships={memberships} />;
    }

    return <JoinOrgForm org={org} userId={user.id} />;
  }

  return (
    <Card className="w-[369px]">
      <CardHeader>
        <CardTitle className="text-xl">Already a Member</CardTitle>
        <CardDescription>
          You are already a member of {org.name}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default withOrgAccess(JoinPage, { allowGuest: true });
