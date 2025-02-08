"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Currency } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { startTransition } from "react";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types/database";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.enum([
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review'
  ] as const),
  member_id_format: z.string().min(1, "Member ID format is required")
    .refine(
      (val) => val.includes('{SEQ:') || val.includes('{YYYY}') || val.includes('{YY}') || val.includes('{MM}') || val.includes('{DD}'),
      "Format must include at least one token: {SEQ:n}, {YYYY}, {YY}, {MM}, or {DD}"
    ),
  form_template_id: z.string().optional().nullable()
});

interface MembershipFormProps {
  groupId: string;
  tier?: IMembershipTierProduct;
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

  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  
  useEffect(() => {
    const fetchFormTemplates = async () => {
      const supabase = createClientComponentClient<Database>();
      const { data: templates, error } = await supabase
        .from('form_templates')
        .select('*')
        .eq('org_id', groupId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching form templates:', error);
        return;
      }

      setFormTemplates(templates || []);
    };

    fetchFormTemplates();
  }, [groupId]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier?.name || '',
      description: tier?.description || '',
      price: tier ? tier.price / 100 : 0,
      currency: tier?.currency || "USD",
      duration_months: tier?.membership_tier?.duration_months || 1,
      activation_type: (tier?.membership_tier?.activation_type || 'automatic') as 'automatic' | 'review_required' | 'payment_required' | 'review_then_payment' | 'form_required' | 'form_then_payment' | 'form_then_review' | 'form_then_payment_then_review',
      member_id_format: tier?.membership_tier?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
      form_template_id: tier?.membership_tier?.form_template_id || null
    },
  });

  // Watch price and activation type changes
  const price = form.watch("price");
  const activationType = form.watch("activation_type");
  
  React.useEffect(() => {
    // If price changes from free to paid
    if (price > 0 && activationType === 'automatic') {
      form.setValue('activation_type', 'payment_required' as const);
    }
    // If price changes from paid to free and has a payment-related activation type
    else if (price === 0 && (activationType === 'payment_required' || activationType === 'review_then_payment')) {
      form.setValue('activation_type', 'automatic' as const);
    }
  }, [price, activationType, form]);

  // Validate form template selection
  React.useEffect(() => {
    if (activationType.includes('form') && !form.getValues('form_template_id')) {
      form.setError('form_template_id', {
        type: 'required',
        message: 'Please select a form template for form-based activation'
      });
    } else {
      form.clearErrors('form_template_id');
    }
  }, [activationType, form]);

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
      formData.append("member_id_format", values.member_id_format);
      formData.append("form_template_id", values.form_template_id || "");

      action(formData);
    });
  });

  const isFree = price === 0;

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
                <Input placeholder="e.g. Basic Membership" {...field} />
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
                <Textarea
                  placeholder="Describe what this membership tier offers..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                  </SelectContent>
                </Select>
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
                  placeholder="12"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="member_id_format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member ID Format</FormLabel>
              <FormControl>
                <Input
                  placeholder="MEM-{YYYY}-{SEQ:3}"
                  {...field}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground mt-1">
                Available tokens: {"{YYYY}"} (year), {"{YY}"} (2-digit year), {"{MM}"} (month), {"{DD}"} (day), {"{SEQ:n}"} (sequence with n digits)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activation_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Activation Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="space-y-4"
                >
                  {isFree ? (
                    <>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="automatic" id="automatic" />
                          <Label htmlFor="automatic">Automatic</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Members are granted access immediately
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="review_required" id="review_required" />
                          <Label htmlFor="review_required">Review Required</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Admin must review and approve applications
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="form_required" id="form_required" />
                          <Label htmlFor="form_required">Form Required</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Members must submit an application form
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="form_then_review" id="form_then_review" />
                          <Label htmlFor="form_then_review">Form then Review</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Members must submit a form for admin review
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="payment_required"
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
                            value="review_then_payment"
                            id="review_then_payment"
                          />
                          <Label htmlFor="review_then_payment">Review Then Payment</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Admin must approve before payment can be made
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="form_then_payment"
                            id="form_then_payment"
                          />
                          <Label htmlFor="form_then_payment">Form then Payment</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Members must submit a form before payment
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="form_then_payment_then_review"
                            id="form_then_payment_then_review"
                          />
                          <Label htmlFor="form_then_payment_then_review">Form, Payment, then Review</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          Members must submit a form and complete payment for admin review
                        </p>
                      </div>
                    </>
                  )}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {activationType.includes('form') && (
          <FormField
            control={form.control}
            name="form_template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Application Form</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form template" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {formTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formTemplates.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No published form templates available. Please create and publish a form template first.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : tier ? "Update Tier" : "Create Tier"}
        </Button>
      </form>
    </Form>
  );
} 