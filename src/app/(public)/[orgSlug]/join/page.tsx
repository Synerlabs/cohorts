import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { JoinOrgForm } from "./components/JoinOrgForm";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function JoinPage({ org, user, isGuest, userRoles, groupUser }: OrgAccessHOCProps) {
  if (!user) {
    return <RegistrationForm orgId={org.id} />;
  }

  console.log(JSON.stringify(userRoles));

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
