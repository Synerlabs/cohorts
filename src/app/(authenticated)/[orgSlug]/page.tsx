import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

async function OrgHomePage({ user, org }: OrgAccessHOCProps) {
  return (
    <p>
      Hello {user?.email} {JSON.stringify(org)}
    </p>
  );
}

export default withOrgAccess(OrgHomePage);
