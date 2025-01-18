import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoleById, getOrgRolePermissions } from "@/services/org.service";
import GroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/group-role-form";
import router from "next/router";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  const { roleId } = await params;
  const role = await getOrgRoleById(roleId);
  return (
    <GroupRoleForm
      groupId={org.id}
      role={role}
      redirectTo={`/@${org.slug}/roles`}
    />
  );
}

export default withOrgAccess(RolePage);
