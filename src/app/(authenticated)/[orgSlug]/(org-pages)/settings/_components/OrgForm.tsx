"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React, { useActionState, useRef } from "react";
import { FormProvider, useForm, useFormState } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { updateCohortDetailsAction } from "@/app/(authenticated)/(main)/home/_actions/update-cohort-details.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import LoadingButton from "@/components/ui/loading-button";

export default function OrgForm({
  className,
  defaultValues,
}: React.HTMLAttributes<HTMLDivElement> & {
  defaultValues: Camelized<Tables<"group">>;
}) {
  const [state, updateCohortDetails, pending] = useToastActionState(
    updateCohortDetailsAction,
    { form: defaultValues },
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
          action={updateCohortDetails}
          onSubmit={(evt) => {
            evt.preventDefault();
            form.handleSubmit(() => {
              console.log(new FormData(formRef.current!));
              updateCohortDetails(new FormData(formRef.current!));
            })(evt);
          }}
        >
          <Input
            type="hidden"
            value={defaultValues.id}
            {...form.register("id")}
          />
          <CardHeader>
            <CardTitle>Community Details</CardTitle>
            <CardDescription>
              Used to identify your community and to help others find you.
            </CardDescription>
          </CardHeader>
          <CardContent className={"flex flex-col gap-4"}>
            <FormField
              name={"name"}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="name">Community Name</Label>
                  <FormControl>
                    <Input
                      placeholder="e.g. Association of Computer Science Students"
                      required
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"alternateName"}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="alternateName">Alternate Name</Label>
                  <FormControl>
                    <Input
                      placeholder="e.g. Aldub R3, NASA, FedEx"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name={"description"}
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="description">Description</Label>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your community"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <LoadingButton loading={pending} disabled={!form.formState.isDirty}>
              Update Details
            </LoadingButton>
          </CardFooter>
        </form>
      </Card>
    </FormProvider>
  );
}
