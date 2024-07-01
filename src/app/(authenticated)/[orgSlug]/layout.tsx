import type { Metadata } from "next";
import "@/app/globals.css";
import Header from "@/app/(authenticated)/_components/header";
import { createClient } from "@/lib/utils/supabase/server";
import { MainSidebar } from "@/app/(authenticated)/_components/sidebar-container";
import { OrgSidebar } from "@/app/(authenticated)/_components/org-sidebar";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { withOrgAccess } from "@/lib/hoc/org";

export const metadata: Metadata = {
  title: "Cohorts",
  description: "Community management system",
};

async function OrgLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { orgSlug: string };
}>) {
  const AuthServerContext = getAuthenticatedServerContext();
  const { org } = AuthServerContext;

  console.log("4544", AuthServerContext);
  return (
    <>
      <MainSidebar>
        <OrgSidebar org={org?.name} />
      </MainSidebar>
      <div className="flex flex-col gap-4 py-4 flex-1">
        <Header user={AuthServerContext.user} />
        <main className="px-6">{children}</main>
      </div>
    </>
  );
}

export default withOrgAccess(OrgLayout);
