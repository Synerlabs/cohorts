import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Sidebar } from "@/components/sidebar";
import Header from "@/app/(authenticated)/_components/header";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cohorts",
  description: "Community management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    redirect("/");
  }
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-col gap-4 py-4 flex-1">
        <Header user={user} />
        <main className="px-6">{children}</main>
      </div>
    </div>
  );
}
