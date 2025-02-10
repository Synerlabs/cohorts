"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
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
import { Database } from "@/lib/types/database.types";
import { toast } from "@/components/ui/use-toast";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.nativeEnum(MembershipActivationType),
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

// Activation type descriptions for better UX
const ACTIVATION_TYPE_DESCRIPTIONS: Record<MembershipActivationType, string> = {
  [MembershipActivationType.AUTOMATIC]: 'Members are granted access immediately upon joining',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Admin must review and approve each application before membership is granted',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Members must complete payment before membership is granted',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Admin must approve the application before the member can proceed with payment',
  [MembershipActivationType.FORM_REQUIRED]: 'Members must complete an application form before membership is granted',
  [MembershipActivationType.FORM_THEN_PAYMENT]: 'Members must complete an application form before proceeding to payment',
  [MembershipActivationType.FORM_THEN_REVIEW]: 'Members submit an application form that must be reviewed and approved by an admin',
  [MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW]: 'Members submit a form and complete payment, then an admin reviews the application'
};

// Group activation types by category for better organization
const ACTIVATION_TYPE_GROUPS = {
  basic: [MembershipActivationType.AUTOMATIC, MembershipActivationType.PAYMENT_REQUIRED],
  review: [MembershipActivationType.REVIEW_REQUIRED, MembershipActivationType.REVIEW_THEN_PAYMENT],
  form: [
    MembershipActivationType.FORM_REQUIRED,
    MembershipActivationType.FORM_THEN_REVIEW,
    MembershipActivationType.FORM_THEN_PAYMENT,
    MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW
  ]
} as const;

export default function MembershipForm({ groupId, tier, onSuccess }: MembershipFormProps) {
  console.log('MembershipForm props:', { groupId, tier });

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

  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier?.name || '',
      description: tier?.description || '',
      price: tier ? tier.price / 100 : 0,
      currency: tier?.currency || "USD",
      duration_months: tier?.membership_tier?.duration_months || 1,
      activation_type: (tier?.membership_tier?.activation_type || MembershipActivationType.AUTOMATIC) as MembershipActivationType,
      member_id_format: tier?.membership_tier?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
      form_template_id: tier?.membership_tier?.form_template_id || null
    },
  });

  // Watch price and activation type changes
  const price = form.watch("price");
  const activationType = form.watch("activation_type");
  
  React.useEffect(() => {
    // If price changes from free to paid
    if (price > 0 && activationType === MembershipActivationType.AUTOMATIC) {
      form.setValue('activation_type', MembershipActivationType.PAYMENT_REQUIRED as const);
    }
    // If price changes from paid to free and has a payment-related activation type
    else if (price === 0 && (activationType === MembershipActivationType.PAYMENT_REQUIRED || activationType === MembershipActivationType.REVIEW_THEN_PAYMENT)) {
      form.setValue('activation_type', MembershipActivationType.AUTOMATIC as const);
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
      <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
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
                  {/* Basic Options */}
                  {ACTIVATION_TYPE_GROUPS.basic.map(type => {
                    // Only show automatic for free tiers and payment_required for paid tiers
                    if ((type === MembershipActivationType.AUTOMATIC && !isFree) ||
                        (type === MembershipActivationType.PAYMENT_REQUIRED && isFree)) {
                      return null;
                    }

                    return (
                      <div key={type} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={type} />
                          <Label htmlFor={type}>{type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {ACTIVATION_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    );
                  })}

                  {/* Review Options */}
                  <div className="mt-4 mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Review-based Options</h4>
                  </div>

                  {ACTIVATION_TYPE_GROUPS.review.map(type => {
                    // Only show review_then_payment for paid tiers
                    if (type === MembershipActivationType.REVIEW_THEN_PAYMENT && isFree) {
                      return null;
                    }

                    return (
                      <div key={type} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={type} />
                          <Label htmlFor={type}>{type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {ACTIVATION_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    );
                  })}

                  {/* Form-based Options */}
                  <div className="mt-4 mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Form-based Options</h4>
                  </div>

                  {ACTIVATION_TYPE_GROUPS.form.map(type => {
                    // Hide payment-related options for free tiers
                    if (isFree && (type === MembershipActivationType.FORM_THEN_PAYMENT || 
                        type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW)) {
                      return null;
                    }

                    return (
                      <div key={type} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value={type} id={type} />
                          <Label htmlFor={type}>{type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</Label>
                        </div>
                        <p className="text-sm text-muted-foreground ml-6">
                          {ACTIVATION_TYPE_DESCRIPTIONS[type]}
                        </p>
                      </div>
                    );
                  })}
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
                <FormLabel>Application Form Template</FormLabel>
                <div className="space-y-3">
                  <div className="flex gap-2 items-start">
                    <Button
                      type="button"
                      variant={field.value ? "outline" : "default"}
                      className="w-full text-left justify-start font-normal"
                      onClick={() => setShowFormTemplateDialog(true)}
                    >
                      {field.value ? (
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Change form template
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <PlusCircle className="h-4 w-4" />
                          Select a form template
                        </span>
                      )}
                    </Button>
                  </div>
                  {field.value ? (
                    <Card className="p-3 border-dashed">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-md">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {formTemplates.find(t => t.id === field.value)?.title || 'Loading...'}
                            </p>
                            <Badge variant="secondary" className="shrink-0">Selected</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {formTemplates.find(t => t.id === field.value)?.description || 'Loading form details...'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Select a form template that members will need to complete when applying for this membership tier
                      </p>
                    </div>
                  )}
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
        )}

        <FormTemplateSelectionDialog
          open={showFormTemplateDialog}
          onOpenChange={setShowFormTemplateDialog}
          onSelect={(template) => {
            form.setValue('form_template_id', template.id);
            setFormTemplates(prev => {
              const exists = prev.some(t => t.id === template.id);
              if (!exists) {
                return [...prev, template];
              }
              return prev;
            });
          }}
          orgId={groupId}
          selectedTemplateId={form.getValues('form_template_id')}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : tier ? "Update Tier" : "Create Tier"}
        </Button>
      </form>
    </Form>
  );
} 