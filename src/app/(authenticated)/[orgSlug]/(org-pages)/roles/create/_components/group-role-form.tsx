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
import { startTransition, useRef, useState, useEffect } from "react";
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
import { groupRolesRowSchema, groupRolesInsertSchema } from "@/lib/types/zod-schemas";
import { z } from "zod";
import PermissionsRow from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/create/_components/permissions-row";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/router";
import { usePathname } from "next/navigation";
import { Pencil, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

type FormData = {
  groupId: string;
  roleName: string;
  description: string;
  permissions: string[];
  id?: string;
};

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
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const defaultValues: FormData = {
    groupId,
    roleName: role?.roleName || "",
    description: role?.description || "",
    permissions: role?.permissions?.filter(Boolean) || [],
    ...(role?.id ? { id: role.id } : {}),
  };
  const pathName = usePathname();
  const form = useForm<FormData>({ defaultValues });
  const formRef = useRef<HTMLFormElement>(null);
  const [state, createGroupRole, pending] = useToastActionState(
    createGroupRoleAction,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        setIsHeaderVisible(e.isIntersecting);
      },
      { threshold: [0] }
    );

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const submitHandler = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    form.handleSubmit((formData) => {
      const submissionData = {
        ...formData,
        permissions: formData.permissions?.filter(Boolean) || [],
      };
      createGroupRole(submissionData);
    })(e);
  };

  return (
    <FormProvider {...form}>
      <form
        className="container max-w-full px-4 py-6"
        ref={formRef}
        onSubmit={submitHandler}
      >
        <div ref={headerRef} className="flex flex-col gap-2 mb-6">
          <div className="flex items-center justify-between">
            {isEditingName ? (
              <div className="flex-1 max-w-md">
                <FormField
                  name="roleName"
                  render={({ field }) => (
                    <Input 
                      {...field} 
                      className="text-2xl font-semibold h-auto py-1"
                      autoFocus
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    />
                  )}
                />
              </div>
            ) : (
              <h1 
                className="text-2xl font-semibold flex items-center gap-2 group cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                {form.watch('roleName') || 'Untitled Role'}
                <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
            {/* {role && (
              <Button size="sm" variant="outline" asChild>
                <Link href={pathName + `/users`} passHref>
                  Manage Users
                </Link>
              </Button>
            )} */}
          </div>
          {isEditingDescription ? (
            <div className="max-w-2xl">
              <FormField
                name="description"
                render={({ field }) => (
                  <Textarea 
                    {...field} 
                    className="text-sm text-muted-foreground resize-none"
                    autoFocus
                    onBlur={() => setIsEditingDescription(false)}
                    rows={2}
                  />
                )}
              />
            </div>
          ) : (
            <p 
              className="text-sm text-muted-foreground group cursor-pointer flex items-center gap-2"
              onClick={() => setIsEditingDescription(true)}
            >
              {form.watch('description') || 'Add a description...'}
              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_25%] xxl:grid-cols-[minmax(0,1fr)_400px] gap-6">
          {/* Left Column - Permissions */}
          <FormField
            name="permissions"
            control={form.control}
            render={({ field }) => (
              <ToggleGroup
                type="multiple"
                variant="outline"
                className="w-full"
                value={field.value?.filter(Boolean) || []}
                onValueChange={(value) => field.onChange(value?.filter(Boolean) || [])}
              >
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle>Permissions</CardTitle>
                    <CardDescription>
                      Manage permissions for this role
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="sticky left-0 bg-background">Module</TableHead>
                            <TableHead >Description</TableHead>
                            <TableHead className="text-right">
                              Permissions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <PermissionsRow permissions={permissions} field={field} />
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </ToggleGroup>
            )}
          />

          {/* Right Column - Role Details */}
          <div className="relative">
            <div className="lg:sticky lg:top-0">
              <Card>
                <CardHeader className="pb-0">
                  <div className={`space-y-2 overflow-hidden transition-[height,opacity] duration-200 ${!isHeaderVisible ? 'h-[72px] opacity-100' : 'h-0 opacity-0'}`}>
                    <h3 
                      className="font-medium flex items-center gap-2 group cursor-pointer"
                      onClick={() => setIsEditingName(true)}
                    >
                      {form.watch('roleName') || 'Untitled Role'}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p 
                      className="text-sm text-muted-foreground line-clamp-2 flex items-center gap-2 group cursor-pointer"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      {form.watch('description') || 'No description'}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Users</span>
                      </div>
                      {role && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={pathName + `/users`}>
                            Manage
                          </Link>
                        </Button>
                      )}
                    </div>
                    
                    {role ? (
                      <div className="flex -space-x-2 overflow-hidden">
                        <Avatar className="inline-block border-2 border-background w-8 h-8">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <Avatar className="inline-block border-2 border-background w-8 h-8">
                          <AvatarImage src="https://github.com/shadcn.png" />
                          <AvatarFallback>CN</AvatarFallback>
                        </Avatar>
                        <Avatar className="inline-block border-2 border-background w-8 h-8">
                          <AvatarFallback>+3</AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No users assigned to this role yet.
                      </p>
                    )}
                  </div>

                  <Separator className="my-6" />

                  <div className="flex flex-col gap-2">
                    {form.formState.isDirty && (
                      <Button 
                        variant="outline" 
                        type="button"
                        onClick={() => form.reset()}
                        disabled={pending}
                      >
                        Revert Changes
                      </Button>
                    )}
                    <LoadingButton loading={pending} disabled={!form.formState.isDirty} className="w-full">
                      {role ? "Update" : "Create"} Role
                    </LoadingButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
