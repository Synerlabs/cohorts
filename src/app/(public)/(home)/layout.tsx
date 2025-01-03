import { MainHero } from "@/app/(public)/(home)/components/hero";
import React from "react";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col md:flex-row items-end stretch md:pb-[5%]">
      <MainHero />
      <div className="w-[369px]">{children}</div>
    </div>
  );
}
