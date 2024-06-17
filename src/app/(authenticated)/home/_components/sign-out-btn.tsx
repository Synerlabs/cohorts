"use client";

import { Button } from "@/components/ui/button";
import { signout } from "@/app/(authenticated)/home/_actions/sign-out.action";
import { useActionState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SignOutBtn() {
  const [state, signoutAction, pending] = useActionState(signout, null);
  return (
    <form>
      <DropdownMenuItem formAction={signout}>Logout</DropdownMenuItem>
    </form>
  );
}
