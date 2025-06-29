"use client";
import { useFormState } from "react-dom";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// import { updatePassword } from "@/app/(public)/[orgSlug]/reset-password/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/utils/supabase/client";

type ResetPasswordState = { error?: string; success?: boolean };

// async function reducer(state: ResetPasswordState, formData: FormData): Promise<ResetPasswordState> {
//   // return await updatePassword(formData);
// }

export function ResetPasswordForm({ orgSlug }: { orgSlug: string }) {
  // const router = useRouter();
  // const searchParams = useSearchParams();
  // const [state, formAction] = useFormState<ResetPasswordState, FormData>(reducer, {});

  // // Set session from access_token in hash or query
  // useEffect(() => {
  //   let accessToken = searchParams.get("access_token");
  //   if (!accessToken && typeof window !== "undefined" && window.location.hash) {
  //     const hash = window.location.hash.substring(1);
  //     const hashParams = new URLSearchParams(hash);
  //     accessToken = hashParams.get("access_token");
  //   }
  //   if (accessToken) {
  //     const supabase = createClient();
  //     supabase.auth.setSession({
  //       access_token: accessToken,
  //       refresh_token: searchParams.get("refresh_token") || "",
  //     });
  //   }
  // }, [searchParams]);

  // useEffect(() => {
  //   if (state?.success) {
  //     setTimeout(() => router.push(`/@${orgSlug}/login?message=Password+reset+successfully`), 2000);
  //   }
  // }, [state, router, orgSlug]);

  // return (
  //   <Card className="w-[369px] mx-auto">
  //     <CardHeader>
  //       <CardTitle className="text-2xl">Reset Password</CardTitle>
  //     </CardHeader>
  //     <CardContent>
  //       <form action={formAction} className="space-y-4">
  //         <div className="grid gap-2">
  //           <Label htmlFor="password">New Password</Label>
  //           <Input id="password" name="password" type="password" required minLength={6} />
  //         </div>
  //         <div className="grid gap-2">
  //           <Label htmlFor="confirmPassword">Confirm Password</Label>
  //           <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} />
  //         </div>
  //         {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
  //         {state?.success && (
  //           <div className="text-green-600 text-sm">
  //             Your password has been reset. You can now log in.
  //           </div>
  //         )}
  //         <Button type="submit" className="w-full">
  //           Reset Password
  //         </Button>
  //       </form>
  //     </CardContent>
  //   </Card>
  // );
} 