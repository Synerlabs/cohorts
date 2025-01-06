"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/app/(public)/(home)/actions/sign-up.action";
import React, { useActionState } from "react";
import { AlertCircle, CircleCheckBig, Loader2 } from "lucide-react";
import { useUser } from "@/lib/context/UserContext";

export type RegistrationFormProps = {
  orgId?: string;
};

export function RegistrationForm({ orgId }: RegistrationFormProps) {
  const { user } = useUser();
  const [state, signup, pending] = useActionState(signUpAction, null);

  if (user) {
    return (
      <Card className="w-[369px]">
        <CardHeader>
          <CardTitle className="text-xl flex flex-col items-center gap-4">
            <CircleCheckBig className="text-green-500" size={40} />
            Already Signed In
          </CardTitle>
          <CardDescription className="text-center">
            You are already signed in as {user.email}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    orgId && formData.append("orgId", orgId); // this will be sanitized in the action
    signup(formData);
  };

  return state?.success ? (
    <Card className="w-[369px] h-[494px] flex items-center justify-center">
      <CardHeader>
        <CardTitle className="text-xl flex flex-col items-center gap-4">
          <CircleCheckBig className="text-green-500" size={40} />
          Account created!
        </CardTitle>
        <CardDescription className={"text-center"}>
          Your account has been successfully created.{" "}
          <span className="font-bold">Check your email</span> for verification
          instructions
        </CardDescription>
      </CardHeader>
    </Card>
  ) : (
    <Card className="w-[369px]">
      <CardHeader>
        <CardTitle className="text-xl">Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input
                  id="first-name"
                  name="firstName"
                  defaultValue={state?.firstName}
                  placeholder="John"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input
                  id="last-name"
                  name="lastName"
                  defaultValue={state?.lastName}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                defaultValue={state?.email}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue={state?.password}
              />
            </div>
            {state?.error && (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>{state?.error}</span>
              </div>
            )}
            <Button
              // formAction={signupAction}
              type="submit"
              className="w-full"
              disabled={pending}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
            <Button variant="outline" className="w-full">
              Sign up with Google
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="#" className="underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
