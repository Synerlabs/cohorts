import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import React from "react";

function PublicLayout({
  children,
  org,
  user,
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

export default withOrgAccess(PublicLayout, { allowGuest: true });
