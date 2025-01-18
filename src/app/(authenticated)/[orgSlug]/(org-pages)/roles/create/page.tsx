import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import GroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/group-role-form";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  return <GroupRoleForm groupId={org.id} redirectTo={`/@${org.slug}/roles`} />;
}

export default withOrgAccess(RolePage);
