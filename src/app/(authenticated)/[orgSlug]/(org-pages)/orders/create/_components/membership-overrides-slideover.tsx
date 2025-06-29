"use client";

import { useFormContext } from "react-hook-form";
import { useState, useEffect } from "react";
import { format } from 'date-fns'; // For date formatting
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
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // For styling
import { Separator } from "@/components/ui/separator"; // For styling

// Product interface similar to the one in order-create-form
interface Product {
  id: string;
  name: string;
  type: string; // e.g., "membership_tier", "one_time", "subscription"
  price: number;
  currency: string;
  // Assuming membership_tier products have these details, adjust as per your actual Product type
  membership_tier?: {
    has_fixed_dates?: boolean;
    fixed_start_date?: string | null;
    fixed_end_date?: string | null;
    duration_months?: number | null;
    duration_unit?: 'month' | 'year' | null;
  };
}

// Zod schemas (can be simplified or removed if type safety is ensured by FormValues directly)
const suborderSchema = z.object({
  productId: z.string(),
  // ... other suborder fields ...
  membershipIdOverride: z.string().optional(),
  membershipStartDate: z.string().optional(),
  membershipEndDate: z.string().optional(),
});

const mainFormSchema = z.object({
  suborders: z.array(suborderSchema),
  // ... other main form fields ...
});

type FormValues = z.infer<typeof mainFormSchema>; // This should ideally come from your main form

interface MembershipOverridesSlideoverProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suborderIndex: number | null;
  products: Product[]; // Pass the list of products
}

export function MembershipOverridesSlideover({
  isOpen,
  onOpenChange,
  suborderIndex,
  products,
}: MembershipOverridesSlideoverProps) {
  const { control, watch, setValue } = useFormContext<FormValues>();
  const [useCustomDates, setUseCustomDates] = useState(false);

  // Hooks are called here, unconditionally at the top level
  const currentSuborderProductId = suborderIndex !== null ? watch(`suborders.${suborderIndex}.productId`) : undefined;
  const selectedProduct = Array.isArray(products) && products.length > 0 && currentSuborderProductId
    ? products.find(p => p.id === currentSuborderProductId) 
    : undefined;

  // Reset useCustomDates when slideover is opened for a new item or closed
  useEffect(() => {
    if (isOpen) {
        if (suborderIndex !== null) {
            const existingStartDate = watch(`suborders.${suborderIndex}.membershipStartDate`);
            const existingEndDate = watch(`suborders.${suborderIndex}.membershipEndDate`);
            if (existingStartDate || existingEndDate) {
                setUseCustomDates(true);
            }
        } // else: suborderIndex is null, do nothing or ensure useCustomDates is false
    } else {
      setUseCustomDates(false); 
    }
  }, [isOpen, suborderIndex, watch]);

  // Clear custom dates from form if checkbox is unchecked
  useEffect(() => {
    if (!useCustomDates && suborderIndex !== null) {
      setValue(`suborders.${suborderIndex}.membershipStartDate`, "");
      setValue(`suborders.${suborderIndex}.membershipEndDate`, "");
    }
  }, [useCustomDates, suborderIndex, setValue]);

  // Now, perform the early return if suborderIndex is null
  if (suborderIndex === null) {
    return null;
  }
  
  const renderDefaultDates = () => {
    console.log("selectedProduct", selectedProduct);
    if (!selectedProduct || selectedProduct.type !== 'membership_tier' || !selectedProduct.membership_tier) {
        return (
            <div className="text-sm text-muted-foreground italic">Product is not a membership tier or has no date info.</div>
        );
    }
    const tierDetails = selectedProduct.membership_tier;
    let startDateStr = format(new Date(), 'PP'); // Default to today
    let endDateStr = 'No end date';

    if (tierDetails.has_fixed_dates && tierDetails.fixed_start_date) {
        startDateStr = format(new Date(tierDetails.fixed_start_date), 'PP');
    }
    if (tierDetails.has_fixed_dates && tierDetails.fixed_end_date) {
        endDateStr = format(new Date(tierDetails.fixed_end_date), 'PP');
    } else if (tierDetails.duration_months) {
        const startDateForCalc = (tierDetails.has_fixed_dates && tierDetails.fixed_start_date) 
                                ? new Date(tierDetails.fixed_start_date)
                                : new Date();
        const durationInMonths = tierDetails.duration_unit === 'year' 
                                ? tierDetails.duration_months * 12 
                                : tierDetails.duration_months;
        endDateStr = format(new Date(startDateForCalc.setMonth(startDateForCalc.getMonth() + durationInMonths)), 'PP');
    }

    return (
        <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
                <p className="text-xs text-muted-foreground">Default Start Date:</p>
                <p className="font-medium">{startDateStr}</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">Default End Date:</p>
                <p className="font-medium">{endDateStr}</p>
            </div>
            {tierDetails.duration_months && (
                <div className="col-span-2 mt-1 text-xs text-muted-foreground">
                    Default Duration: {tierDetails.duration_months} {
                        tierDetails.duration_unit === 'year' 
                            ? tierDetails.duration_months > 1 ? 'years' : 'year'
                            : tierDetails.duration_months > 1 ? 'months' : 'month'
                    }
                </div>
            )}
        </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Membership Overrides (Item {suborderIndex + 1})</SheetTitle>
          <SheetDescription>
            Configure custom membership details for &quot;{selectedProduct?.name || 'this item'}&quot;.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 py-6">
            {/* Membership ID Override */}
            <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/50">
                    <CardTitle className="text-sm font-medium">Membership Identifier</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <FormField
                        control={control}
                        name={`suborders.${suborderIndex}.membershipIdOverride`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Custom Member ID (Optional)</FormLabel>
                            <FormControl>
                            <Input {...field} placeholder="e.g., MEM-2025-001" />
                            </FormControl>
                            <FormDescription>
                            If empty, a standard ID might be generated by the system upon processing.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Membership Period */}
            <Card className="overflow-hidden">
                <CardHeader className="py-3 px-4 bg-muted/50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Membership Period</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id={`custom-dates-${suborderIndex}`}
                                checked={useCustomDates}
                                onCheckedChange={(checked) => {
                                    setUseCustomDates(checked as boolean);
                                }}
                            />
                            <Label htmlFor={`custom-dates-${suborderIndex}`} className="text-xs">
                                Override dates
                            </Label>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {!useCustomDates ? (
                        renderDefaultDates()
                    ) : (
                        <div className="space-y-4">
                            <FormField
                                control={control}
                                name={`suborders.${suborderIndex}.membershipStartDate`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom Start Date</FormLabel>
                                    <FormControl>
                                    <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`suborders.${suborderIndex}.membershipEndDate`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Custom End Date</FormLabel>
                                    <FormControl>
                                    <Input type="date" {...field} placeholder="YYYY-MM-DD" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <p className="text-xs text-muted-foreground italic">
                                Note: Custom dates override the membership tier&apos;s default duration settings.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
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