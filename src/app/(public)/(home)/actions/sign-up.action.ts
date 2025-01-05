"use server";
import { createClient } from "@/lib/utils/supabase/server";
import { SignUpWithPasswordCredentials } from "@supabase/auth-js";
import {
  createOrgMember,
  getOrgById,
  getOrgRoleById,
} from "@/services/org.service";

type CurrentState = {
  email?: string;
  password?: string;
  success: boolean;
  error?: string;
} | null;

export async function signUpAction(
  currentState: CurrentState,
  formData: FormData,
) {
  const supabase = createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const orgId = formData.get("orgId") as string;
  const org = orgId ? await getOrgById(orgId) : null;
  console.log("ORG", orgId, org);

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data: SignUpWithPasswordCredentials = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: org
        ? `http://127.0.0.1:3000/@${org?.data?.slug}`
        : undefined,
    },
  };

  const { error, data: user } = await supabase.auth.signUp(data);
  if (error) {
    console.error(error.message);
    return {
      email,
      password,
      firstName,
      lastName,
      success: false,
      error: error.message,
    };
  } else {
    if (org?.data && user?.user) {
      const { id } = await createOrgMember({
        groupId: org.data.id,
        userId: user?.user?.id,
      });
    }
    return {
      success: true,
      message: "Sign up successful",
    };
  }
}
