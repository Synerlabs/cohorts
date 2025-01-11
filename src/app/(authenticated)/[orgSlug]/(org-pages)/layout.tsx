import type { Metadata } from "next";
import "@/app/globals.css";
import Header from "@/app/(authenticated)/_components/header";
import { MainSidebar } from "@/app/(authenticated)/_components/sidebar-container";
import { OrgSidebar } from "@/app/(authenticated)/_components/org-sidebar";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { withOrgAccess } from "@/lib/hoc/org";

export const metadata: Metadata = {
  title: "Cohorts",
  description: "Community management system",
};

type OrgLayoutProps = {
  children: React.ReactNode;
  params: { orgSlug: string };
};

async function OrgLayout({ children, params }: Readonly<OrgLayoutProps>) {
  const AuthServerContext = getAuthenticatedServerContext();
  const { org, user } = AuthServerContext;

  return (
    <>
      <MainSidebar>
        <OrgSidebar org={org} user={user} />
      </MainSidebar>
      <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto">
        <Header user={AuthServerContext.user} baseUrl={`${org.slug}`} />
        fasdfadf
        <main className="px-6">{children}</main>
      </div>
    </>
  );
}

export default withOrgAccess(OrgLayout, { allowNonMember: true });
