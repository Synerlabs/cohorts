"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import LoadingButton from "@/components/ui/loading-button";
import { FormProvider, useForm } from "react-hook-form";
import { useRef } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { createGroupRoleAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/_actions/group-role.action";

export default function CreateGroupRoleForm({ groupId }: { groupId: string }) {
  const form = useForm();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, createGroupRole, pending] = useToastActionState(
    createGroupRoleAction,
  );
  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 w-full justify-center items-center align-middle"
        ref={formRef}
        action={createGroupRole}
        onSubmit={(evt) => {
          evt.preventDefault();
          form.handleSubmit(() => {
            createGroupRole(new FormData(formRef.current!));
          })(evt);
        }}
      >
        <div className="flex md:max-w-screen-md w-full mt-4">
          <h2>Create Role</h2>
        </div>
        <Card className="md:max-w-screen-md w-full">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>
              Information about the role you are creating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              className="w-full"
              name="groupId"
              type="hidden"
              value={groupId}
            />
            <div className="grid gap-6">
              <div className="grid gap-3">
                <FormField
                  name="roleName"
                  render={({ field }) => (
                    <>
                      <Label htmlFor="name">Name</Label>
                      <Input className="w-full" {...field} />
                    </>
                  )}
                />
              </div>
              <div className="grid gap-3">
                <FormField
                  name="description"
                  render={({ field }) => (
                    <>
                      <Label htmlFor="description">Description</Label>
                      <Textarea {...field} className="min-h-32" />
                    </>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:max-w-screen-md w-full">
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Manage permissions for this role</CardDescription>
          </CardHeader>
          <CardContent></CardContent>
        </Card>
        <div className="flex justify-end w-full md:max-w-screen-md">
          <LoadingButton loading={pending}>Create Role</LoadingButton>
        </div>
      </form>
    </FormProvider>
  );
}
