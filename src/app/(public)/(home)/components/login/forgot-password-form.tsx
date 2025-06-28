"use client";
import { useActionState } from "react";
import { sendResetEmail } from "@/app/(public)/[orgSlug]/forgot-password/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ForgotPasswordState = { error?: string; success?: boolean };

async function reducer(state: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  return await sendResetEmail(formData);
}

export function ForgotPasswordForm({ orgSlug }: { orgSlug: string }) {
  console.log("ForgotPasswordForm orgSlug:", orgSlug);
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(reducer, {});

  return (
    <Card className="w-[369px] mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Forgot Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoFocus />
          </div>
          {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
          {state?.success && (
            <div className="text-green-600 text-sm">
              If your email is registered, you will receive a password reset link.
            </div>
          )}
          <Button type="submit" className="w-full">
            Send Reset Link
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 