"use client";

import { useFormContext, Controller } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form"; // Assuming you have these
import { z } from "zod";

// Assuming your main form schema is defined elsewhere and includes the suborder structure
// This is a simplified version of what might be in your main form\'s Zod schema
const suborderSchema = z.object({
  productId: z.string(),
  amount: z.number(),
  currency: z.string(),
  membershipIdOverride: z.string().optional(),
  membershipStartDate: z.string().optional(),
  membershipEndDate: z.string().optional(),
});

const mainFormSchema = z.object({
  // ... other fields
  suborders: z.array(suborderSchema),
});

type FormValues = z.infer<typeof mainFormSchema>;

interface MembershipOverridesSlideoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suborderIndex: number | null;
  // Pass the react-hook-form instance
  // We use useFormContext, so no need to pass form directly if Provider is used
  // control: Control<FormValues>; // Control object from useForm
}

export function MembershipOverridesSlideover({
  isOpen,
  onOpenChange,
  suborderIndex,
}: MembershipOverridesSlideoverProps) {
  const { control, watch, setValue } = useFormContext<FormValues>(); // Use FormContext

  if (suborderIndex === null) {
    return null; // Or some loading/error state
  }

  const suborderProductId = watch(`suborders.${suborderIndex}.productId`);
  // In a real scenario, you\'d have your products array available here or passed as a prop
  // to check if suborderProductId corresponds to a "membership_tier" type.
  // For this example, we\'ll assume it\'s a membership if overrides are being shown.

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Membership Overrides (Item {suborderIndex + 1})</SheetTitle>
          <SheetDescription>
            Configure custom membership details for this specific order item. These
            will only apply if the selected product is a membership tier.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <FormField
            control={control}
            name={`suborders.${suborderIndex}.membershipIdOverride`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Membership ID Override (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Custom membership identifier" />
                </FormControl>
                <FormDescription>
                  Assign a unique ID for this membership instance.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`suborders.${suborderIndex}.membershipStartDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date Override (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                </FormControl>
                <FormDescription>
                  Set a custom start date for this membership.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`suborders.${suborderIndex}.membershipEndDate`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date Override (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                </FormControl>
                <FormDescription>
                  Set a custom end date for this membership.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
} 