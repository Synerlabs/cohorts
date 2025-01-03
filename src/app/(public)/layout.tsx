import Link from "next/link";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import React from "react";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";

function PublicLayout({
  children,
  user,
}: {
  children: React.ReactNode;
} & AuthHOCProps) {
  return (
    <div className="flex min-h-screen flex-col items-center py-12 sm:px-6 lg:p-8 absolute top-0 z-[-2] h-screen w-screen bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
      <div className="flex xl:max-w-screen-xl w-full justify-between items-center">
        <div className="flex">
          <div className="flex font-bold">
            <span>c</span>
            <span className="-ml-[3px]">o</span>
          </div>
          <span className="text-[30px] font-bold tracking-tighter">
            cohorts.
          </span>
        </div>

        <nav className="flex gap-8">
          <Link href={"/"}>Home</Link>
          <Link href={"/about"}>About</Link>
          <Link href={"/contact"}>Contact</Link>
          {user ? (
            <div className="-mt-2">
              <AvatarDropdown user={user} />
            </div>
          ) : (
            <Link href={"/sign-up"}>Sign Up</Link>
          )}
        </nav>
      </div>
      <main className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-screen-md lg:max-w-screen-lg flex-1 flex">
        {children}
      </main>
    </div>
  );
}

export default withAuth(PublicLayout, { allowGuest: true });
