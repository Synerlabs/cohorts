import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import { User } from "@supabase/auth-js";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";

export type AuthHOCProps = {
  user: User;
  params?: any;
};

export function withAuth(Component: any) {
  return async function WithAuth(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.user) {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        redirect("/");
      }

      AuthServerContext.user = user;
    }

    return <Component user={AuthServerContext.user} {...props} />;
  };
}
