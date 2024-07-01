import type { Metadata } from "next";
import "@/app/globals.css";
import Header from "@/app/(authenticated)/_components/header";
import { MainSidebar } from "@/app/(authenticated)/_components/sidebar-container";
import React from "react";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";

export const metadata: Metadata = {
  title: "Cohorts",
  description: "Community management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const AuthServerContext = getAuthenticatedServerContext();
  const { user } = AuthServerContext;
  return (
    <>
      <MainSidebar />
      <div className="flex flex-col gap-4 py-4 flex-1">
        <Header user={user} />
        <main className="px-6">{children}</main>
      </div>
    </>
  );
}
