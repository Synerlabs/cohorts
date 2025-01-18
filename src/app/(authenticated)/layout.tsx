import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Sidebar } from "@/components/sidebar";
import Header from "@/app/(authenticated)/_components/header";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { MainSidebar } from "@/app/(authenticated)/_components/sidebar-container";
import { OrgSidebar } from "@/app/(authenticated)/_components/org-sidebar";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { withAuth } from "@/lib/hoc/auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cohorts",
  description: "Community management system",
};

async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: any;
}>) {
  params = await params;
  return (
    <div className="flex h-screen w-full bg-muted/40 overflow-hidden">
      {children}
    </div>
  );
}

export default withAuth(RootLayout, { redirectUnauthenticated: "/" });
