import { MainHero } from "@/app/(public)/(home)/components/hero";
import React from "react";
import Link from "next/link";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";
import { AuthHOCProps, withAuth } from "@/lib/hoc/auth";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

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
      <div className="flex xl:max-w-screen-xl w-full justify-between items-center px-4 py-4 md:px-0 md:py-0">
        <div className="flex">
          <div className="flex font-bold">
            <span>c</span>
            <span className="-ml-[3px]">o</span>
          </div>
          <span className="text-[30px] font-bold tracking-tighter">
            cohorts.
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          <Link href={"/"}>Home</Link>
          <Link href={"/about"}>About</Link>
          <Link href={"/contact"}>Contact</Link>
          {user ? (
            <>
              <Link href={"/dashboard"}>Dashboard</Link>
              <div className="-mt-2">
                <AvatarDropdown user={user} />
              </div>
            </>
          ) : (
            <Link href={"/sign-up"}>Sign Up</Link>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="flex flex-col gap-4 mt-8">
              <Link href={"/"}>Home</Link>
              <Link href={"/about"}>About</Link>
              <Link href={"/contact"}>Contact</Link>
              {user ? (
                <>
                  <Link href={"/dashboard"}>Dashboard</Link>
                  <div className="mt-2">
                    <AvatarDropdown user={user} />
                  </div>
                </>
              ) : (
                <Link href={"/sign-up"}>Sign Up</Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <main className="w-full px-4 md:px-0 md:sm:mx-auto md:sm:w-full md:sm:max-w-md md:md:max-w-screen-md md:lg:max-w-screen-lg flex-1 flex">
        <div className="flex flex-col w-full md:flex-row items-center md:items-end stretch md:pb-[5%]">
          <MainHero />
          <div className="w-full md:w-[369px] mt-8 md:mt-0">{children}</div>
        </div>
      </main>
    </>
  );
}

export default withAuth(PublicLayout, { allowGuest: true });
