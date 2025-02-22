import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoleById, getOrgRolePermissions } from "@/services/org.service";
import GroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/group-role-form";
import { permissions } from "@/lib/types/permissions";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { Camelized } from "humps";
import { Tables } from "@/lib/types/database.types";

type UserRole = Camelized<Tables<"user_roles">> & {
  groupRoles: Camelized<Tables<"group_roles">> | null;
};

async function RolePage({ org, params }: OrgAccessHOCProps) {
  const { roleId } = await params;
  const { groupRoles = [] } = getAuthenticatedServerContext();
  
  // Handle undefined roleId
  if (!roleId || Array.isArray(roleId)) {
    return notFound();
  }

  const role = await getOrgRoleById(roleId);
  
  // If role doesn't exist, show 404
  if (!role) {
    return notFound();
  }

  // Check if current user is a super admin
  const isCurrentUserSuperAdmin = groupRoles.some((userRole: UserRole) => 
    userRole.is_active && userRole.group_roles?.is_super_admin
  );
  console.log("role", role);
  // If role is a super admin role
  if (role.isSuperAdmin) {
    return (
      <div className="container max-w-full px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{role.roleName || "Super Admin"}</CardTitle>
            <CardDescription>
              This is a super admin role with full access to all organization features. 
              {!isCurrentUserSuperAdmin && "For security reasons, this role can only be managed by other super admins."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Super admin roles automatically have access to all current and future permissions within the organization.
              This ensures they can always manage all aspects of the organization.
            </p>
            {isCurrentUserSuperAdmin ? (
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href={`/@${org.slug}/roles/${roleId}/users`}>
                    Manage Users
                  </Link>
                </Button>
                <Button asChild>
                  <Link href={`/@${org.slug}/roles/${roleId}/edit`}>
                    Edit Role
                  </Link>
                </Button>
              </div>
            ) : (
              <Button variant="outline" asChild>
                <Link href={`/@${org.slug}/roles/${roleId}/users`}>
                  View Users
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // For non-super admin roles, show the edit form
  return (
    <GroupRoleForm
      groupId={org.id}
      role={role}
      redirectTo={`/@${org.slug}/roles`}
    />
  );
}

export default withOrgAccess(RolePage, {
  permissions: [permissions.roles.edit],
  onAccessDenied: {
    action: "error"
  },
});
