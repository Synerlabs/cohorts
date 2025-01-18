import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import OrgForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/settings/_components/OrgForm";
import { getOrgBySlug } from "@/services/org.service";
import SlugForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/settings/_components/SlugForm";

async function OrgSettingsPage({ org }: OrgAccessHOCProps) {
  const { data } = await getOrgBySlug(org.slug);
  return (
    <div className="flex flex-col gap-4 w-full justify-center items-center align-middle">
      <div className="md:max-w-screen-md w-full mt-4">
        <h2>Site Settings</h2>
      </div>

      {data && (
        <div className="flex flex-col items-center gap-4 md:max-w-screen-md w-full">
          <OrgForm className="w-full flex-1" defaultValues={data} />
          <SlugForm className="w-full flex-1" defaultValues={data} />
        </div>
      )}
    </div>
  );
}

export default withOrgAccess(OrgSettingsPage);
