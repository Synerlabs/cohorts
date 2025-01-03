import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

async function OrgHomePage({ params, searchParams, org }: OrgAccessHOCProps) {
  return (
    <p>
      {JSON.stringify(org)}
      {JSON.stringify(params)}
      {JSON.stringify(searchParams)}
    </p>
  );
}

export default withOrgAccess(OrgHomePage, { allowGuest: true });
