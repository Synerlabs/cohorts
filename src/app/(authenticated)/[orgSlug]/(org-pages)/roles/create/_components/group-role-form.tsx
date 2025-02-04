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
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { startTransition, useRef } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { createGroupRoleAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/_actions/group-role.action";
import { permissions } from "@/lib/types/permissions";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { groupRolesRowSchema } from "@/lib/types/zod-schemas";
import { z } from "zod";
import PermissionsRow from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/permissions-row";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/router";
import { usePathname } from "next/navigation";

export default function GroupRoleForm({
  groupId,
  role,
  onSuccess,
  redirectTo,
}: {
  groupId: string;
  role?: z.infer<typeof groupRolesRowSchema>;
  onSuccess?: (data: { id: string }) => void;
  redirectTo?: string;
}) {
  const defaultValues = {
    groupId,
    roleName: role?.roleName || "",
    description: role?.description || "",
    permissions: role?.permissions || [],
    ...(role?.id ? { id: role.id } : {}),
  };
  const pathName = usePathname();
  const form = useForm({ defaultValues });
  const formRef = useRef<HTMLFormElement>(null);
  const [state, createGroupRole, pending] = useToastActionState(
    createGroupRoleAction,
  );

  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit((formData) => {
      startTransition(async () => {
        const submissionData = {
          ...formData,
          ...(role?.id ? { id: role.id } : {}),
          redirectTo,
        };
        await createGroupRole(submissionData);
      });
    })(e);
  };

  return (
    <FormProvider {...form}>
      <form
        className="flex flex-col gap-4 w-full justify-center items-center align-middle"
        ref={formRef}
        action={createGroupRole}
        onSubmit={submitHandler}
      >
        <div className="flex md:max-w-screen-md w-full mt-4">
          <h2>{role ? "Edit Role" : "Create Role"}</h2>
          <Button size="sm" className="ml-auto" variant="outline" asChild>
            <Link href={pathName + `/users`} passHref>
              Manage Users
            </Link>
          </Button>
        </div>
        <Card className="md:max-w-screen-md w-full">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>
              Information about the role you are creating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <FormField
                  name="roleName"
                  render={({ field }) => (
                    <>
                      <Label htmlFor="name">Name</Label>
                      <Input className="w-full" {...field} required />
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
                      <Textarea {...field} className="min-h-32" required />
                    </>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <FormField
          name="permissions"
          control={form.control}
          render={({ field }) => (
            <ToggleGroup
              type="multiple"
              variant="outline"
              className="w-full"
              value={field.value || []}
              onValueChange={field.onChange}
            >
              <Card className="md:max-w-screen-md w-full">
                <CardHeader>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Manage permissions for this role
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Module</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">
                          Permissions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <PermissionsRow permissions={permissions} field={field} />
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </ToggleGroup>
          )}
        />
        <div className="flex justify-end w-full md:max-w-screen-md my-4">
          <LoadingButton loading={pending} disabled={!form.formState.isDirty}>
            {role ? "Update" : "Create"} Role
          </LoadingButton>
        </div>
      </form>
    </FormProvider>
  );
}
