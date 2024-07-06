import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

async function OrgHomePage({
  user,
  org,
  params,
  searchParams,
}: OrgAccessHOCProps) {
  return (
    <p>
      Hello {user?.email} {JSON.stringify(org)}
      {JSON.stringify(params)}
      {JSON.stringify(searchParams)}
    </p>
  );
}

export default withOrgAccess(OrgHomePage);
