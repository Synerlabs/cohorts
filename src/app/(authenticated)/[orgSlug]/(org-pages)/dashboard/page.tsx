import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

async function OrgHomePage({
  user,
  org,
  params,
  searchParams,
}: OrgAccessHOCProps) {
  const _params = await params;
  const _searchParams = await searchParams;
  return (
    <p>
      Hello {user?.email} {JSON.stringify(org)}
      {JSON.stringify(_params)}
      {JSON.stringify(_searchParams)}
    </p>
  );
}

export default withOrgAccess(OrgHomePage);
