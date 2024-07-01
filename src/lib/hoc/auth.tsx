import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import React from "react";
import { User } from "@supabase/auth-js";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { PageProps } from "@/lib/types/next";
import { getCurrentUser } from "@/services/user.service";

export type AuthHOCProps = {
  user: User;
  params?: any;
} & PageProps;

export function withAuth(Component: any) {
  return async function WithAuth(props: any) {
    const AuthServerContext = getAuthenticatedServerContext();

    if (!AuthServerContext.user) {
      const response = await getCurrentUser();
      if (response.error) {
        redirect("/");
      }

      AuthServerContext.user = response.data;
    }

    return <Component user={AuthServerContext.user} {...props} />;
  };
}
