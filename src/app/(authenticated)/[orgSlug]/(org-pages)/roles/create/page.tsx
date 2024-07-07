import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import CreateGroupRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/create-group-role-form";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  return <CreateGroupRoleForm groupId={org.id} />;
}

export default withOrgAccess(RolePage);
