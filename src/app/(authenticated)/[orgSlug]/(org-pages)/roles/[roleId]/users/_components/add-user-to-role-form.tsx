"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import { PlusCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FormField } from "@/components/ui/form";
import { FormProvider, useForm } from "react-hook-form";
import { Suspense, useEffect, useRef, useState } from "react";
import { addRoleUserAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_actions/role-user.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import LoadingButton from "@/components/ui/loading-button";

interface User {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
}

interface AddUserToRoleFormProps {
  users: {
    data: User[];
  };
  groupRoleId: string;
}

interface FormValues {
  userIds: string[];
  groupRoleId: string;
}

export default function AddUserToRoleForm({ users, groupRoleId }: AddUserToRoleFormProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      userIds: [],
      groupRoleId,
    },
  });
  const [state, addRoleUser, pending] = useToastActionState(
    addRoleUserAction,
    {},
    "",
    {
      successTitle: "Success",
      successDescription: "Your user has been added to the role successfully.",
    },
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [AddOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (AddOpen) {
      form.reset();
    }
  }, [AddOpen, form]);

  const handleSubmit = async (data: FormValues) => {
    const formData = new FormData();
    formData.append('groupRoleId', data.groupRoleId);
    data.userIds.forEach(userId => formData.append('userIds[]', userId));
    await addRoleUser(formData);
    setAddOpen(false);
  };

  return (
    <FormProvider {...form}>
      <Dialog open={AddOpen} onOpenChange={setAddOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Users
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            ref={formRef}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Add Users</DialogTitle>
              <DialogDescription>
                Select users to add to the role and click save
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex-1">
              <FormField
                name="groupRoleId"
                render={({ field }) => <input type="hidden" {...field} />}
              />
              <FormField
                name="userIds"
                render={({ field }) => (
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    className="w-full flex-col"
                    {...field}
                    value={field.value || []}
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                  >
                    {users?.data?.map((user) => (
                      <ToggleGroupItem
                        name={user.id}
                        key={user.id}
                        value={user.id}
                        className="w-full justify-start !py-6"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="cursor-pointer">
                            {user.avatar_url && (
                              <AvatarImage src={user.avatar_url} />
                            )}
                            {user.first_name && user.last_name && (
                              <AvatarFallback className="border bg-background">
                                {user.first_name[0]}
                                {user.last_name[0]}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          {user.first_name} {user.last_name}
                          {user.email && (
                            <span className="text-sm text-muted-foreground">
                              {user.email}
                            </span>
                          )}
                        </div>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                )}
              />
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="sm"
                loading={pending}
                disabled={!form.formState.isDirty}
              >
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
