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
import { Suspense, useRef } from "react";
import { addRoleUserAction } from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_actions/role-user.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import LoadingButton from "@/components/ui/loading-button";

export default function AddUserToRoleForm({ users, groupRoleId }) {
  const form = useForm({
    defaultValues: {
      userIds: [],
      groupRoleId,
    },
  });
  const [state, addRoleUser, pending] = useToastActionState(
    addRoleUserAction,
    { form: form.getValues() },
    null,
    {
      successTitle: "Success",
      successDescription: "Your user has been added to the role successfully.",
    },
  );
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    addRoleUser(e);
  };
  return (
    <FormProvider {...form}>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Users
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form
            ref={formRef}
            action={addRoleUser}
            onSubmit={(evt) => {
              evt.preventDefault();
              console.log("WHAT");
              form.handleSubmit(async (e) => {
                console.log(e);
                await addRoleUser(e);
              })(evt);
            }}
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
              <Button variant="outline" size="sm">
                Cancel
              </Button>
              <LoadingButton type="submit" size="sm" loading={pending}>
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FormProvider>
  );
}
