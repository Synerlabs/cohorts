import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import React from "react";
import Link from "next/link";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";

function PublicLayout({
  children,
  org,
  user,
}: OrgAccessHOCProps & {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="flex xl:max-w-screen-xl w-full justify-between items-center">
        <div className="flex">
          <span className="text-[30px] font-bold tracking-tighter">
            {org.alternateName || org.name}
          </span>
        </div>

        <nav className="flex gap-8">
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
      </div>
      <main className="sm:mx-auto sm:w-full sm:max-w-md md:max-w-screen-md lg:max-w-screen-lg flex-1 flex">
        {children}
      </main>
    </>
  );
}

export default withOrgAccess(PublicLayout, { allowGuest: true });
