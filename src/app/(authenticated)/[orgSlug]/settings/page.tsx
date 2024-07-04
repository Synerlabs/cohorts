import { withOrgAccess } from "@/lib/hoc/org";
function OrgSettingsPage() {
  return (
    <>
      <h1>Settings</h1>
    </>
  );
}

export default withOrgAccess(OrgSettingsPage);
