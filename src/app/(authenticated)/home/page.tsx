import { redirect } from "next/navigation";

import { createClient } from "@/lib/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { signout } from "@/app/(authenticated)/home/_actions/sign-out.action";
import { SignOutBtn } from "@/app/(authenticated)/home/_components/sign-out-btn";

export default async function PrivatePage() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    console.log("error", error);
    // redirect("/");
  }

  return (
    <div>
      <SignOutBtn />
      Hello {data?.user?.email} {JSON.stringify(data?.user)}
    </div>
  );
}
