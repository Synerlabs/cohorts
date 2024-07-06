import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import OrgForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/settings/_components/OrgForm";
import { getOrgBySlug } from "@/services/org.service";

async function OrgSettingsPage({ org }: OrgAccessHOCProps) {
  const { data } = await getOrgBySlug(org.slug);
  return (
    <div className="flex flex-col gap-8 md:max-w-screen-md">
      <h2>Site Settings</h2>
      {data && (
        <div className="flex flex-col items-center gap-4">
          <OrgForm className="w-full flex-1" defaultValues={data} />
        </div>
      )}
    </div>
  );
}

export default withOrgAccess(OrgSettingsPage);
