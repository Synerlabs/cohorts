"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input as AltInput } from "@/components/ui/alt-input";
import { Input } from "@/components/ui/input";
import React, { useRef } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import LoadingButton from "@/components/ui/loading-button";
import { updateSlugAction } from "@/app/(authenticated)/(main)/home/_actions/update-slug.action";
import ConfirmSlugUpdate from "@/app/(authenticated)/[orgSlug]/(org-pages)/settings/_components/confirm-slug-update";
import { Button } from "@/components/ui/button";

export default function SlugForm({
  className,
  defaultValues,
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValues: Camelized<Tables<"group">>;
}) {
  const [state, updateSlug, pending] = useToastActionState(
    updateSlugAction,
    { form: defaultValues },
    null,
    {
      successTitle: "Success",
      successDescription:
        "Your community details have been updated successfully.",
    },
  );
  const form = useForm({ defaultValues: state?.form });
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <FormProvider {...form}>
      <Card className={className}>
        <form
          ref={formRef}
          action={updateSlug}
          onSubmit={(evt) => {
            evt.preventDefault();
            form.handleSubmit(() => {
              updateSlug(new FormData(formRef.current!));
            })(evt);
          }}
        >
          <Input
            type="hidden"
            value={defaultValues.id}
            {...form.register("id")}
          />
          <CardHeader>
            <CardTitle>Slug</CardTitle>
            <CardDescription>
              Used to identify your cohort and to help others find you.
            </CardDescription>
          </CardHeader>
          <CardContent className={"flex flex-col gap-4"}>
            <FormField
              name={"slug"}
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <AltInput
                      startAdornment="@"
                      placeholder="mySite"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <ConfirmSlugUpdate
              confirmBtn={
                <LoadingButton
                  loading={pending}
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  Update Slug
                </LoadingButton>
              }
            >
              <Button disabled={!form.formState.isDirty}>Update Slug</Button>
            </ConfirmSlugUpdate>
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}
