import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import { User } from "@supabase/auth-js";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { PageProps } from "@/lib/types/next";
import { getCurrentUser } from "@/services/user.service";

export type AuthHOCOptions = {
  allowGuest?: boolean;
};

export type AuthHOCProps = {
  user: User;
  params?: any;
} & PageProps;

export function withAuth(
  Component: any,
  options: AuthHOCOptions = { allowGuest: false },
) {
  return async function WithAuth(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.user) {
      const response = await getCurrentUser();
      if ((response.error || !response.data?.user) && !options.allowGuest) {
        console.log(
          `withAuth - Redirecting to home: [allowGuest: ${options.allowGuest}]`,
        );
        redirect("/");
      }

      if (response && response.data && response.data.user)
        AuthServerContext.user = response.data.user;
    }

    return <Component user={AuthServerContext.user} {...props} />;
  };
}
