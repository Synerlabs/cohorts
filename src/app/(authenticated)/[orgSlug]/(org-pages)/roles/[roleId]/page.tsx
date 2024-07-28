import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoleById, getOrgRolePermissions } from "@/services/org.service";
import GroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/group-role-form";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  const role = await getOrgRoleById(params.roleId);
  return <GroupRoleForm groupId={org.id} role={role} />;
}

export default withOrgAccess(RolePage);
