"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MembershipActivationType, MembershipTier, Currency } from "@/lib/types/membership";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { startTransition } from "react";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.nativeEnum(MembershipActivationType),
});

interface MembershipFormProps {
  groupId: string;
  tier?: MembershipTier;
  onSuccess?: () => void;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

export default function MembershipForm({ groupId, tier, onSuccess }: MembershipFormProps) {
  const [state, action, pending] = useToastActionState(
    tier ? updateMembershipTierAction : createMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: tier ? "Membership tier updated" : "Membership tier created",
      successDescription: tier
        ? "Your membership tier has been updated successfully."
        : "Your membership tier has been created successfully.",
    }
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier?.name || "",
      description: tier?.description || "",
      price: tier ? tier.price / 100 : 0, // Convert cents to dollars for display
      currency: tier?.currency || "USD",
      duration_months: tier?.duration_months || 1,
      activation_type: tier?.activation_type || MembershipActivationType.AUTOMATIC,
    },
  });

  if (state?.success && onSuccess) {
    onSuccess();
  }

  const onSubmit = form.handleSubmit((values) => {
    startTransition(() => {
      const formData = new FormData();
      formData.append("group_id", groupId);
      if (tier) {
        formData.append("id", tier.id);
      }
      
      // Handle each field type appropriately
      formData.append("name", values.name);
      formData.append("description", values.description || "");
      formData.append("price", Math.round(values.price * 100).toString()); // Convert dollars to cents
      formData.append("currency", values.currency);
      formData.append("duration_months", values.duration_months.toString());
      formData.append("activation_type", values.activation_type);

      action(formData);
    });
  });

  const selectedCurrency = form.watch("currency") as Currency;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(currencySymbols).map(([code, symbol]) => (
                      <SelectItem key={code} value={code}>
                        {code} ({symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">
                      {currencySymbols[selectedCurrency]}
                    </span>
                    <Input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      className="pl-7"
                      {...field} 
                      onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      value={field.value}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="duration_months"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (months)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1" 
                  {...field} 
                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activation_type"
          render={({ field }) => {
            const price = form.watch("price");
            const isFree = price === 0;

            // If switching between free and paid, reset to appropriate default
            React.useEffect(() => {
              if (isFree && (field.value === MembershipActivationType.PAYMENT_REQUIRED || field.value === MembershipActivationType.REVIEW_THEN_PAYMENT)) {
                field.onChange(MembershipActivationType.AUTOMATIC);
              }
              if (!isFree && field.value === MembershipActivationType.AUTOMATIC) {
                field.onChange(MembershipActivationType.PAYMENT_REQUIRED);
              }
            }, [isFree, field]);

            return (
              <FormItem>
                <FormLabel>Activation Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col space-y-2"
                  >
                    {/* Options for free memberships */}
                    {isFree && (
                      <>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={MembershipActivationType.AUTOMATIC}
                              id="automatic"
                            />
                            <Label htmlFor="automatic">Automatic</Label>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            Members are automatically approved without review or payment
                          </p>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={MembershipActivationType.REVIEW_REQUIRED}
                              id="review_required"
                            />
                            <Label htmlFor="review_required">Review Required</Label>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            Admin must review and approve applications before membership is granted
                          </p>
                        </div>
                      </>
                    )}

                    {/* Options for paid memberships */}
                    {!isFree && (
                      <>
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={MembershipActivationType.PAYMENT_REQUIRED}
                              id="payment_required"
                            />
                            <Label htmlFor="payment_required">Payment Required</Label>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            Members must complete payment before membership is granted
                          </p>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={MembershipActivationType.REVIEW_THEN_PAYMENT}
                              id="review_then_payment"
                            />
                            <Label htmlFor="review_then_payment">Review Then Payment</Label>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            Admin must approve applications before members can proceed to payment
                          </p>
                        </div>
                      </>
                    )}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {tier ? "Update Membership Tier" : "Create Membership Tier"}
        </Button>
      </form>
    </Form>
  );
} 