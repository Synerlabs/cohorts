'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database } from "@/lib/types/database.types";
import { toast } from "@/components/ui/use-toast";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle, Check, Shield, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getFormTemplateById } from "../../forms/_actions/form-template.action";
import { updateMembershipTierAction } from "../_actions/membership.action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleSelectionDialog } from './role-selection-dialog';
import { getRolesAction } from '../_actions/roles.action';
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { PostgrestError } from '@supabase/supabase-js';
import { Separator } from "@/components/ui/separator";
import React from 'react';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];
type GroupRole = Database['public']['Tables']['group_roles']['Row'];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  requires_form: z.boolean().default(false),
  requires_review: z.boolean().default(false),
  review_before_payment: z.boolean().default(false),
  member_id_format: z.string().min(1, "Member ID format is required")
    .refine(
      (val) => val.includes('{SEQ:') || val.includes('{YYYY}') || val.includes('{YY}') || val.includes('{MM}') || val.includes('{DD}'),
      "Format must include at least one token: {SEQ:n}, {YYYY}, {YY}, {MM}, or {DD}"
    ),
  form_template_id: z.string().optional().nullable(),
  roles: z.array(z.string()).default([]),
  is_active: z.boolean().default(true)
});

interface EditMembershipTierFormProps {
  tier: IMembershipTierProduct;
  groupId: string;
  onSuccess?: () => void;
  initialFormTemplate?: FormTemplate | null;
  initialRoles?: GroupRole[];
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

// Helper function to convert step configuration to MembershipActivationType
function getActivationType({
  price,
  requires_form,
  requires_review,
  review_before_payment
}: {
  price: number,
  requires_form: boolean,
  requires_review: boolean,
  review_before_payment: boolean
}): MembershipActivationType {
  if (price === 0) {
    if (!requires_form && !requires_review) return MembershipActivationType.AUTOMATIC;
    if (requires_form && !requires_review) return MembershipActivationType.FORM_REQUIRED;
    if (!requires_form && requires_review) return MembershipActivationType.REVIEW_REQUIRED;
    if (requires_form && requires_review) return MembershipActivationType.FORM_THEN_REVIEW;
  } else {
    if (!requires_form && !requires_review) return MembershipActivationType.PAYMENT_REQUIRED;
    if (!requires_form && requires_review) {
      return review_before_payment ? MembershipActivationType.REVIEW_THEN_PAYMENT : MembershipActivationType.PAYMENT_REQUIRED;
    }
    if (requires_form && !requires_review) return MembershipActivationType.FORM_THEN_PAYMENT;
    if (requires_form && requires_review) {
      return review_before_payment ? MembershipActivationType.FORM_THEN_REVIEW : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
    }
  }
  return price === 0 ? MembershipActivationType.AUTOMATIC : MembershipActivationType.PAYMENT_REQUIRED;
}

// Helper function to convert MembershipActivationType to step configuration
function getStepConfiguration(type: MembershipActivationType): {
  requires_form: boolean;
  requires_review: boolean;
  review_before_payment: boolean;
} {
  return {
    requires_form: type.includes('form'),
    requires_review: type.includes('review'),
    review_before_payment: type === MembershipActivationType.REVIEW_THEN_PAYMENT || 
                         type === MembershipActivationType.FORM_THEN_REVIEW
  };
}

export function EditMembershipTierForm({ 
  tier, 
  groupId, 
  onSuccess,
  initialFormTemplate,
  initialRoles = []
}: EditMembershipTierFormProps) {
  const [state, action, pending] = useToastActionState(
    updateMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: "Membership tier updated",
      successDescription: "Your membership tier has been updated successfully.",
    }
  );

  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(
    initialFormTemplate ? [initialFormTemplate] : []
  );
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [roles, setRoles] = useState<Array<{
    id: string;
    role_name: string;
    permissions: string[];
  }>>(initialRoles.map(role => ({
    id: role.id,
    role_name: role.role_name || '',
    permissions: role.permissions || []
  })));
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier.name,
      description: tier.description || '',
      price: tier.price / 100,
      currency: tier.currency,
      duration_months: tier.membership_tier.duration_months,
      ...getStepConfiguration(tier.membership_tier.activation_type as MembershipActivationType),
      member_id_format: tier.membership_tier.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
      form_template_id: tier.membership_tier.form_template_id || null,
      roles: tier.membership_tier.roles?.map(role => role.id) || [],
      is_active: tier.is_active
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append('id', tier.id);
    formData.append('group_id', groupId);
    formData.append('name', values.name);
    formData.append('description', values.description || '');
    formData.append('price', String(Math.round(values.price * 100)));
    formData.append('currency', values.currency);
    formData.append('duration_months', String(values.duration_months));
    formData.append('is_active', String(values.is_active));

    const activationType = getActivationType({
      price: values.price,
      requires_form: values.requires_form,
      requires_review: values.requires_review,
      review_before_payment: values.review_before_payment
    });

    formData.append('activation_type', activationType);
    formData.append('member_id_format', values.member_id_format);
    formData.append('form_template_id', values.form_template_id || '');
    formData.append('roles', JSON.stringify(values.roles));

    await action(formData);
    onSuccess?.();
  };

  const handleRoleSelect = (roleIds: string[]) => {
    form.setValue('roles', roleIds);
  };

  const removeRole = (roleId: string) => {
    const currentRoles = form.getValues('roles');
    form.setValue('roles', currentRoles.filter(id => id !== roleId));
  };

  const selectedTemplate = formTemplates.find(t => t.id === form.watch('form_template_id'));
  const selectedRoles = form.watch('roles');
  const selectedRoleDetails = roles.filter(role => selectedRoles.includes(role.id));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Status Bar */}
        <div>
          <div className="flex items-center justify-between py-4">
            <h1 className="text-xl font-semibold">Edit Membership Tier</h1>
          </div>
          <Separator />
        </div>

        {/* Form Content */}
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content - Col 1-2 */}
          <div className="col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Basic Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure the core details of your membership tier.
                  </p>
                </div>
                <Separator />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Basic Membership" {...field} />
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
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Pricing & Duration */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Pricing & Duration</h2>
                  <p className="text-sm text-muted-foreground">
                    Set the price and duration for this membership tier.
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">
                              {currencySymbols[form.watch('currency') as Currency]}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              className="pl-7"
                              {...field}
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                            />
                          </div>
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
                      <FormLabel>Duration</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            className="w-24"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                          <span className="text-muted-foreground">months</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Activation Settings */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Activation Process</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how members are activated for this tier.
                  </p>
                </div>
                <Separator />

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="requires_form"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel>Application Form</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Require members to complete an application form before joining
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_review"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel>Admin Review</FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Require admin approval before membership is granted
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('requires_review') && form.watch('price') > 0 && (
                    <FormField
                      control={form.control}
                      name="review_before_payment"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1">
                            <FormLabel>Review Before Payment</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Review applications before allowing members to pay
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h3 className="font-medium mb-2">Current Activation Flow</h3>
                  <div className="flex items-center gap-2">
                    {[
                      form.watch('requires_form') ? { step: 1, label: "Complete Form" } : null,
                      form.watch('requires_review') && form.watch('review_before_payment') ? { step: 2, label: "Admin Review" } : null,
                      form.watch('price') > 0 ? { step: 3, label: "Payment" } : null,
                      form.watch('requires_review') && !form.watch('review_before_payment') ? { step: 4, label: "Admin Review" } : null,
                      { step: 5, label: "Membership Granted" }
                    ].filter((step): step is { step: number; label: string } => step !== null).map((step, index, array) => (
                      <React.Fragment key={step.step}>
                        <Badge variant="secondary" className="h-7">
                          {step.label}
                        </Badge>
                        {index < array.length - 1 && (
                          <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                            <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 18l6-6-6-6"/>
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Col 3 */}
          <div className="space-y-6">
            {/* Member ID Format */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">Member ID Format</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how member IDs are generated.
                  </p>
                </div>
                <Separator />
                <FormField
                  control={form.control}
                  name="member_id_format"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Format Pattern</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm font-medium">Available tokens:</p>
                        <div className="space-y-1">
                          {[
                            { token: '{SEQ:n}', desc: 'Sequential number' },
                            { token: '{YYYY}', desc: '4-digit year' },
                            { token: '{YY}', desc: '2-digit year' },
                            { token: '{MM}', desc: 'Month' },
                            { token: '{DD}', desc: 'Day' }
                          ].map(({ token, desc }) => (
                            <div key={token} className="flex items-center gap-2 text-sm">
                              <code className="px-1 py-0.5 rounded bg-muted">{token}</code>
                              <span className="text-muted-foreground">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Form Template Selection */}
            {form.watch('requires_form') && (
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold">Application Form</h2>
                      <p className="text-sm text-muted-foreground">
                        Select the form template for applications.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFormTemplateDialog(true)}
                    >
                      {selectedTemplate ? (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Change
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4 mr-2" />
                          Select
                        </>
                      )}
                    </Button>
                  </div>
                  <Separator />

                  {selectedTemplate ? (
                    <div className="rounded-lg border bg-card p-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-md bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-medium">{selectedTemplate.title}</p>
                          {selectedTemplate.description && (
                            <p className="text-sm text-muted-foreground">
                              {selectedTemplate.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
                      <h3 className="mt-2 font-medium">No form selected</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Click the button above to select an application form
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Role Selection */}
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Member Roles</h2>
                    <p className="text-sm text-muted-foreground">
                      Assign roles to members in this tier.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRoleDialog(true)}
                  >
                    {selectedRoleDetails.length > 0 ? (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Manage
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
                <Separator />
              </div>
            </Card>
          </div>
        </div>

        <RoleSelectionDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          onSelect={handleRoleSelect}
          groupId={groupId}
          selectedRoleIds={form.getValues('roles')}
        />

        {/* <FormTemplateSelectionDialog
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
        /> */}
      </form>
    </Form>
  );
} 