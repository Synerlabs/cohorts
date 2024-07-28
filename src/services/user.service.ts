import { createClient } from "@/lib/utils/supabase/server";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUsers() {
  const supabase = createClient();
  const { data, error } = await supabase.from("profiles").select("*");

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUser({ id }: { id: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser(id);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}

export async function getUserByEmail({ email }: { email: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUserByEmail(email);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}
export async function getUserByProvider({ provider }: { provider: string }) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUserByProvider(provider);

  if (error) {
    return { error: error.message };
  } else {
    return { data };
  }
}
