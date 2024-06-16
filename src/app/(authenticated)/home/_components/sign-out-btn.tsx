"use client";

import { Button } from "@/components/ui/button";
import { signout } from "@/app/(authenticated)/home/_actions/sign-out.action";
import { useActionState } from "react";

export function SignOutBtn() {
  const [state, signoutAction, pending] = useActionState(signout, null);
  return (
    <form>
      <Button formAction={signoutAction}>Logout {pending ? "..." : ""}</Button>
    </form>
  );
}
