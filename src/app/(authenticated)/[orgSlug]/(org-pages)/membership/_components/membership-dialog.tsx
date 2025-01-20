"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, startTransition } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import {
  createMembershipTierAction,
  updateMembershipTierAction,
} from "../_actions/membership.action";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.enum(['automatic', 'review_required', 'payment_required', 'review_then_payment'] as const),
});

interface MembershipDialogProps {
  children?: React.ReactNode;
  orgId: string;
  membership?: IMembershipTierProduct;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export default function MembershipDialog({
  children,
  orgId,
  membership,
  open,
  onOpenChange,
  trigger,
}: MembershipDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isEditing = !!membership;
  
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen;
  
  const [state, action, pending] = useToastActionState(
    isEditing ? updateMembershipTierAction : createMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: isEditing ? "Membership Updated" : "Membership Created",
      successDescription: isEditing 
        ? "The membership has been updated successfully"
        : "New membership has been created successfully"
    }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: membership?.name || "",
      description: membership?.description || "",
      price: membership?.price || 0,
      duration_months: membership?.membership_tier?.duration_months || 1,
      activation_type: membership?.membership_tier?.activation_type || 'automatic',
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(() => {
      const formData = new FormData();
      
      // Append all form values to FormData
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      // Append additional data
      if (isEditing) {
        formData.append("id", membership.id);
      } else {
        formData.append("group_id", orgId);
      }

      action(formData);
    });

    if (state?.success === true) {
      setIsOpen?.(false);
      form.reset();
    }
  });

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!state || state.success) {
          setIsOpen?.(open);
          if (!open) {
            form.reset();
          }
        }
      }}
    >
      <DialogTrigger asChild>{trigger || children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Membership" : "Create New Membership"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={handleSubmit} 
            className="space-y-4"
            autoComplete="off"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      autoComplete="off"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration_months"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      autoComplete="off"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activation_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activation Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select activation type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="automatic">
                        Automatic Activation
                        <span className="text-xs text-muted-foreground block">
                          Member becomes active immediately upon joining
                        </span>
                      </SelectItem>
                      <SelectItem value="review_required">
                        Requires Review
                        <span className="text-xs text-muted-foreground block">
                          Admin must approve membership application
                        </span>
                      </SelectItem>
                      <SelectItem value="payment_required">
                        Payment Required
                        <span className="text-xs text-muted-foreground block">
                          Member must pay before becoming active
                        </span>
                      </SelectItem>
                      <SelectItem value="review_then_payment">
                        Review then Payment
                        <span className="text-xs text-muted-foreground block">
                          Admin approval required before payment
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className={cn(
                "w-full",
                pending && "cursor-not-allowed opacity-50"
              )}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>{isEditing ? "Update Membership" : "Create Membership"}</>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
