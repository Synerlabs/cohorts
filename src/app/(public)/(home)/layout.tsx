import { MainHero } from "@/app/(public)/(home)/components/hero";
import React from "react";
import Link from "next/link";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";

function PublicLayout({
  children,
  user,
}: Readonly<
  {
    children: React.ReactNode;
  } & AuthHOCProps
>) {
  return (
    <>
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
        <div className="flex flex-col md:flex-row items-end stretch md:pb-[5%]">
          <MainHero />
          <div className="w-[369px]">{children}</div>
        </div>
      </main>
    </>
  );
}

export default withAuth(PublicLayout, { allowGuest: true });
