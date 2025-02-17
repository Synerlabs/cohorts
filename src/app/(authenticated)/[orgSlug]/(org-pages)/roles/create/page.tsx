import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import GroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/group-role-form";
import { permissions } from "@/lib/types/permissions";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  const _params = await params;
  return <GroupRoleForm groupId={org.id} redirectTo={`/@${org.slug}/roles`} />;
}

export default withOrgAccess(RolePage, {
  permissions: [permissions.roles.create],
  onAccessDenied: {
    action: "error"
  },
});
