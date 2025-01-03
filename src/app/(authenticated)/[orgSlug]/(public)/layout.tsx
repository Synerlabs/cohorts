import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

function PublicLayout({
  children,
  org,
}: OrgAccessHOCProps & {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto w-full max-w-screen-xl mx-auto">
      <div>
        <h2>{org.name}</h2>
      </div>
      {children}
    </div>
  );
}

export default withOrgAccess(PublicLayout);
