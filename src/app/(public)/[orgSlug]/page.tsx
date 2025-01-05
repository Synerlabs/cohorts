import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import React from "react";
import { MainHero } from "@/app/(public)/(home)/components/hero";
import { LoginForm } from "@/app/(public)/(home)/components/login/login-form";
import { Typewriter } from "@/components/ui/typewriter";
import { Button } from "@/components/ui/button";

async function OrgHomePage({ user, org, isGuest }: OrgAccessHOCProps) {
  return (
    <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-auto w-full max-w-screen-xl mx-auto">
      <div className="flex flex-col md:flex-row items-end stretch md:pb-[5%] mt-16">
        <div className="pb-[110px] flex-1">
          <h1>{org.name}</h1>
          <h3 className="pt-4 pr-8">{org.description}</h3>
          {isGuest && <Button>Join</Button>}
        </div>
        {!user && (
          <div className="w-[369px]">
            <LoginForm redirect={`/@${org.slug}/dashboard`} />
          </div>
        )}
      </div>
    </div>
  );
}

export default withOrgAccess(OrgHomePage, { allowGuest: true });
