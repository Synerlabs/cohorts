import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import React from "react";
import Link from "next/link";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

function PublicLayout({
  children,
  org,
  user,
}: OrgAccessHOCProps & {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex xl:max-w-screen-xl w-full justify-between items-center px-4 py-4 md:px-0 md:py-0">
        <div className="flex">
          <span className="text-[30px] font-bold tracking-tighter">
            {org.alternateName || org.name}
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-8">
          <Link href={`/@${org.slug}`}>Home</Link>
          {user && <Link href={`/@${org.slug}/dashboard`}>Dashboard</Link>}
          <Link href={`/@${org.slug}/about`}>About</Link>
          <Link href={`/@${org.slug}/contact`}>Contact</Link>
          {user ? (
            <div className="-mt-2">
              <AvatarDropdown user={user} baseUrl={`${org.slug}`} />
            </div>
          ) : (
            <Link href={`/@${org.slug}/join`}>Join</Link>
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
              <Link href={`/@${org.slug}`}>Home</Link>
              {user && <Link href={`/@${org.slug}/dashboard`}>Dashboard</Link>}
              <Link href={`/@${org.slug}/about`}>About</Link>
              <Link href={`/@${org.slug}/contact`}>Contact</Link>
              {user ? (
                <div className="mt-2">
                  <AvatarDropdown user={user} baseUrl={`${org.slug}`} />
                </div>
              ) : (
                <Link href={`/@${org.slug}/join`}>Join</Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <main className="w-full px-4 md:px-0 md:sm:mx-auto md:sm:w-full md:sm:max-w-md md:md:max-w-screen-md md:lg:max-w-screen-lg flex-1 flex">
        {children}
      </main>
    </>
  );
}

export default withOrgAccess(PublicLayout, { allowGuest: true });
