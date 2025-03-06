"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { MembershipService } from "@/services/membership.service";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { startTransition } from "react";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types/database.types";
import { toast } from "@/components/ui/use-toast";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle, Check, Shield, Clock, DollarSign, ArrowRight, ActivityIcon, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { getFormTemplateById } from "../../forms/_actions/form-template.action";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleSelectionDialog } from './role-selection-dialog';
import { getRolesAction } from '../_actions/roles.action';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];
type GroupRole = Database['public']['Tables']['group_roles']['Row'];

// Enum for membership form types
export enum MembershipFormType {
  MEMBER = 'membership',
  AFFILIATION = 'organization'
}

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
  roles: z.array(z.string()).default([])
});

interface MembershipFormProps {
  groupId: string;
  tier?: IMembershipTierProduct;
  onSuccess?: () => void;
  type?: MembershipFormType;
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
  [MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW]: 'Members submit a form and complete payment, then an admin reviews the application',
  [MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT]: 'Members submit a form that is reviewed by an admin, then proceed to payment'
};

// Group activation types by category for better organization
const ACTIVATION_TYPE_GROUPS = {
  basic: [MembershipActivationType.AUTOMATIC, MembershipActivationType.PAYMENT_REQUIRED],
  review: [MembershipActivationType.REVIEW_REQUIRED, MembershipActivationType.REVIEW_THEN_PAYMENT],
  form: [
    MembershipActivationType.FORM_REQUIRED,
    MembershipActivationType.FORM_THEN_REVIEW,
    MembershipActivationType.FORM_THEN_PAYMENT,
    MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
    MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
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
      return review_before_payment ? MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
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
                         type === MembershipActivationType.FORM_THEN_REVIEW ||
                         type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
  };
}

// Add helper function to get visualization steps for the activation flow
function getActivationSteps(type: MembershipActivationType) {
  const steps: Array<{ label: string; color: string; bg: string }> = [];
  
  // Form step
  if (type.includes("form")) {
    steps.push({ 
      label: "Form", 
      color: "text-blue-700", 
      bg: "bg-blue-100" 
    });
  }
  
  // Payment step
  if (type.includes("payment")) {
    if (type === MembershipActivationType.PAYMENT_REQUIRED || 
        type === MembershipActivationType.FORM_THEN_PAYMENT ||
        type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW) {
      steps.push({ 
        label: "Payment", 
        color: "text-green-700", 
        bg: "bg-green-100" 
      });
    }
  }
  
  // Review step
  if (type.includes("review")) {
    steps.push({ 
      label: "Review", 
      color: "text-amber-700", 
      bg: "bg-amber-100" 
    });
  }
  
  // Payment step (if after review)
  if (type === MembershipActivationType.REVIEW_THEN_PAYMENT ||
      type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
    steps.push({ 
      label: "Payment", 
      color: "text-green-700", 
      bg: "bg-green-100" 
    });
  }
  
  // Empty flow (automatic)
  if (steps.length === 0) {
    steps.push({ 
      label: "Automatic", 
      color: "text-purple-700", 
      bg: "bg-purple-100" 
    });
  }
  
  return steps;
}

export default function MembershipForm({ groupId, tier, onSuccess, type = MembershipFormType.MEMBER }: MembershipFormProps) {
  console.log('MembershipForm props:', { groupId, tier, type });

  // If we have a tier with a type, use that type (this ensures editing works correctly)
  const [membershipType, setMembershipType] = useState<MembershipFormType>(
    tier?.membership_tier?.type === 'organization' 
      ? MembershipFormType.AFFILIATION 
      : type
  );

  useEffect(() => {
    // Update membership type if tier changes
    if (tier?.membership_tier?.type === 'organization') {
      setMembershipType(MembershipFormType.AFFILIATION);
    } else if (tier?.membership_tier?.type === 'membership') {
      setMembershipType(MembershipFormType.MEMBER);
    }
  }, [tier]);

  const [state, action, pending] = useToastActionState(
    tier ? updateMembershipTierAction : createMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: tier 
        ? (membershipType === MembershipFormType.MEMBER ? "Membership tier updated" : "Affiliation tier updated")
        : (membershipType === MembershipFormType.MEMBER ? "Membership tier created" : "Affiliation tier created"),
      successDescription: tier
        ? (membershipType === MembershipFormType.MEMBER ? "Your membership tier has been updated successfully." : "Your affiliation tier has been updated successfully.")
        : (membershipType === MembershipFormType.MEMBER ? "Your membership tier has been created successfully." : "Your affiliation tier has been created successfully."),
    }
  );

  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [roles, setRoles] = useState<Array<{
    id: string;
    role_name: string;
    permissions: string[];
  }>>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: tier?.name || '',
      description: tier?.description || '',
      price: tier ? tier.price / 100 : 0,
      currency: tier?.currency || "USD",
      duration_months: tier?.membership_tier?.duration_months || 1,
      ...getStepConfiguration(tier?.membership_tier?.activation_type as MembershipActivationType || MembershipActivationType.AUTOMATIC),
      member_id_format: tier?.membership_tier?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
      form_template_id: tier?.membership_tier?.form_template_id || null,
      roles: []
    },
  });

  // Add useEffect to load form template when component mounts
  useEffect(() => {
    const loadFormTemplate = async () => {
      const formTemplateId = form.getValues('form_template_id');
      if (!formTemplateId) return;
      
      setIsLoadingTemplate(true);
      try {
        const supabase = createClientComponentClient<Database>();
        const { data, error } = await getFormTemplateById(formTemplateId);

        if (error) throw error;
        if (data) {
          setFormTemplates(prev => {
            const exists = prev.some(t => t.id === data.id);
            if (!exists) {
              return [...prev, data];
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error loading form template:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form template details',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTemplate(false);
      }
    };

    loadFormTemplate();
  }, []);

  // Update useEffect to load roles when component mounts
  useEffect(() => {
    const loadRoles = async () => {
      console.log('Loading roles for group:', groupId);
      setIsLoadingRoles(true);
      try {
        const roleData = await getRolesAction(groupId);
        console.log('Roles loaded:', roleData);
        
        const mappedRoles = roleData.map(role => ({
          id: role.id,
          role_name: role.role_name || '',
          permissions: role.permissions || []
        }));
        console.log('Mapped roles:', mappedRoles);
        setRoles(mappedRoles);
      } catch (error) {
        console.error('Error loading roles:', error);
        toast({
          title: 'Error',
          description: 'Failed to load group roles',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingRoles(false);
      }
    };

    if (groupId) {
      loadRoles();
    } else {
      console.warn('No groupId provided for loading roles');
    }
  }, [groupId]);

  // Update tier roles loading as well
  useEffect(() => {
    const loadTierRoles = async () => {
      if (!tier?.id) return;

      try {
        const supabase = await createClientComponentClient<Database>();
        const { data: tierRoles, error } = await supabase
          .from('membership_tier_roles')
          .select(`
            id,
            group_role_id,
            group_roles (
              id,
              role_name,
              permissions
            )
          `)
          .eq('tier_id', tier.id)
          .is('deleted_at', null)
          .is('group_roles.is_super_admin', false);

        console.log('Tier roles query result:', { tierRoles, error });

        if (error) throw error;
        if (tierRoles) {
          const roleIds = tierRoles
            .filter(tr => tr.group_roles) // Filter out any null roles
            .map(tr => tr.group_role_id);
          console.log('Setting tier roles:', roleIds);
          form.setValue('roles', roleIds);
        }
      } catch (error) {
        console.error('Error loading tier roles:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tier roles',
          variant: 'destructive',
        });
      }
    };

    loadTierRoles();
  }, [tier?.id, form]);

  // Watch form values
  const price = form.watch("price");
  const requires_form = form.watch("requires_form");
  const requires_review = form.watch("requires_review");
  const review_before_payment = form.watch("review_before_payment");

  // Compute current activation type
  const activationType = getActivationType({
    price,
    requires_form,
    requires_review,
    review_before_payment
  });

  const isFree = price === 0;

  if (state?.success && onSuccess) {
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(values => {
        startTransition(() => {
          const formData = new FormData();
          formData.append("group_id", groupId);
          formData.append("type", membershipType);
          
          if (tier) {
            formData.append("id", tier.id);
          }
          
          // Handle each field type appropriately
          formData.append("name", values.name);
          formData.append("description", values.description || "");
          formData.append("price", Math.round(values.price * 100).toString()); // Convert dollars to cents
          formData.append("currency", values.currency);
          formData.append("duration_months", values.duration_months.toString());
          formData.append("activation_type", getActivationType({
            price: values.price,
            requires_form: values.requires_form,
            requires_review: values.requires_review,
            review_before_payment: values.review_before_payment
          }));
          formData.append("member_id_format", values.member_id_format);
          
          // Only add form_template_id if form is required and a valid template ID exists
          if (values.requires_form && values.form_template_id) {
            formData.append("form_template_id", values.form_template_id);
          } else {
            formData.append("form_template_id", "null");
          }
          
          formData.append("roles", JSON.stringify(values.roles));

          action(formData);
        });
      })} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {tier ? 'Edit' : 'Create'} {membershipType === MembershipFormType.MEMBER ? 'Membership' : 'Affiliation'} Tier
          </h2>
          <p className="text-muted-foreground">
            {membershipType === MembershipFormType.MEMBER 
              ? 'Configure how individuals can become members of your organization.' 
              : 'Configure how organizations can affiliate with your organization.'}
          </p>
        </div>
        
        {/* 1. Basic Information */}
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={membershipType === MembershipFormType.MEMBER 
                      ? "e.g. Basic Membership" 
                      : "e.g. Partner Organization"} 
                    {...field} 
                  />
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
                    placeholder={membershipType === MembershipFormType.MEMBER 
                      ? "Describe what this membership tier offers..." 
                      : "Describe what this affiliation tier offers..."}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* 2. Application Process */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">
                {membershipType === MembershipFormType.MEMBER ? "Membership" : "Affiliation"} Activation Process
              </h3>
              <p className="text-muted-foreground text-sm">
                Configure how new {membershipType === MembershipFormType.MEMBER ? "member" : "organization"} applications are processed
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-5 space-y-6 bg-card shadow-sm">
            {/* Application Form Toggle */}
            <div className="flex items-start justify-between">
              <div className="space-y-1 leading-none">
                <div className="text-sm font-medium flex items-center gap-2">
                  <FileText size={16} className="text-primary" />
                  Application form
                </div>
                <p className="text-muted-foreground text-xs">
                  Require a form submission before {membershipType === MembershipFormType.MEMBER ? "membership" : "affiliation"}
                </p>
              </div>
              <FormField
                control={form.control}
                name="requires_form"
                render={({ field }) => (
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (!checked) {
                          form.setValue('form_template_id', null);
                        }
                      }}
                    />
                  </FormControl>
                )}
              />
            </div>
            
            {/* Form Template Selection (only when form is required) */}
            {requires_form && (
              <div className="mt-3 pl-6">
                <FormField
                  control={form.control}
                  name="form_template_id"
                  render={({ field }) => (
                    <FormItem>
                      <Button
                        type="button"
                        variant={field.value ? "outline" : "secondary"}
                        className="w-full justify-between"
                        onClick={() => setShowFormTemplateDialog(true)}
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {field.value ? (
                            <span>
                              {formTemplates.find(t => t.id === field.value)?.title || 'Selected Template'}
                            </span>
                          ) : (
                            <span>Select a form template</span>
                          )}
                        </span>
                        <PlusCircle className="h-4 w-4 opacity-70" />
                      </Button>
                      <FormDescription className="text-xs">
                        {field.value 
                          ? "Selected template: " + (formTemplates.find(t => t.id === field.value)?.title || 'Form Template') 
                          : "Choose a form template for applicants to complete"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormTemplateSelectionDialog
                  open={showFormTemplateDialog}
                  onOpenChange={setShowFormTemplateDialog}
                  orgId={groupId}
                  selectedTemplateId={form.watch('form_template_id')}
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
                />
              </div>
            )}

            {/* Admin Review Toggle */}
            <div className="flex items-start justify-between">
              <div className="space-y-1 leading-none">
                <div className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle size={16} className="text-primary" />
                  Admin review
                </div>
                <p className="text-muted-foreground text-xs">
                  Require manual approval before {membershipType === MembershipFormType.MEMBER ? "member" : "organization"} is accepted
                </p>
              </div>
              <FormField
                control={form.control}
                name="requires_review"
                render={({ field }) => (
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                )}
              />
            </div>

            {/* Review Timing (only shows when price > 0 and requires review) */}
            {!isFree && requires_review && (
              <div className="border-t pt-4 mt-2">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  Review timing
                </h4>
                <RadioGroup
                  defaultValue={review_before_payment ? "before" : "after"}
                  value={review_before_payment ? "before" : "after"}
                  onValueChange={(value) => form.setValue("review_before_payment", value === "before")}
                  className="gap-3 grid"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md bg-background">
                    <RadioGroupItem value="after" id="after-payment" />
                    <div className="grid gap-1">
                      <Label htmlFor="after-payment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        After payment
                      </Label>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {membershipType === MembershipFormType.MEMBER ? "Member" : "Organization"} pays first, then admin reviews the application
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 border p-3 rounded-md bg-background">
                    <RadioGroupItem value="before" id="before-payment" />
                    <div className="grid gap-1">
                      <Label htmlFor="before-payment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Before payment
                      </Label>
                      <p className="text-xs text-muted-foreground leading-snug">
                        Admin reviews the application first, then {membershipType === MembershipFormType.MEMBER ? "member" : "organization"} pays
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Payment Toggle */}
            <div className="flex items-start justify-between border-t pt-4">
              <div className="space-y-1 leading-none">
                <div className="text-sm font-medium flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  Payment required
                </div>
                <p className="text-muted-foreground text-xs">
                  This {membershipType === MembershipFormType.MEMBER ? "membership" : "affiliation"} requires payment
                </p>
              </div>
              <Switch
                checked={!isFree}
                onCheckedChange={(checked) => {
                  // Only modify the price if we're toggling from free to paid
                  if (checked && form.getValues("price") === 0) {
                    form.setValue("price", 1);
                  } else if (!checked) {
                    form.setValue("price", 0);
                  }
                }}
              />
            </div>
            
            {/* Payment Details (only shows when payment is required) */}
            {!isFree && (
              <div className="mt-3 pl-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="pl-8"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = value === "" ? 0 : parseFloat(value);
                                field.onChange(numValue);
                                
                                // If price becomes 0, make sure to handle the UI state
                                if (numValue === 0) {
                                  // We might need to update other form values if the price is 0
                                  form.setValue("price", 0);
                                }
                              }}
                            />
                          </FormControl>
                        </div>
                        <FormDescription>
                          Amount to charge for this {membershipType === MembershipFormType.MEMBER ? "membership" : "affiliation"}
                        </FormDescription>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                            <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Currency for the payment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Activation Flow Visualization */}
          <div className="pt-2">
            <div className="text-sm border p-4 bg-muted/30 rounded-md">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                <ActivityIcon size={16} className="text-primary" />
                Activation Flow
              </h5>
              <div className="flex items-center gap-2 text-sm">
                {getActivationSteps(activationType).map((step, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <ArrowRight size={14} className="text-muted-foreground" />
                    )}
                    <div className={`px-2 py-1 rounded ${step.color} ${step.bg}`}>
                      {step.label}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

        {/* 3. Duration */}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === "" ? 1 : parseInt(value);
                    field.onChange(numValue);
                  }}
                />
              </FormControl>
              <FormDescription>
                How long the {membershipType === MembershipFormType.MEMBER ? "membership" : "affiliation"} lasts
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 4. Membership ID Format */}
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
              <FormDescription>
                Available tokens: {"{YYYY}"} (year), {"{YY}"} (2-digit year), {"{MM}"} (month), {"{DD}"} (day), {"{SEQ:n}"} (sequence with n digits)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 5. Roles */}
        <FormField
          control={form.control}
          name="roles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member Roles</FormLabel>
              <div className="space-y-3">
                <div className="flex gap-2 items-start">
                  <Button
                    type="button"
                    variant={field.value.length > 0 ? "secondary" : "outline"}
                    className="w-full text-left justify-start font-normal"
                    onClick={() => setShowRoleDialog(true)}
                  >
                    {field.value.length > 0 ? (
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Change role selection
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Select member roles
                      </span>
                    )}
                  </Button>
                </div>
                {field.value.length > 0 ? (
                  <Card className="p-3 border-dashed">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-md">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {isLoadingRoles ? (
                              "Loading..."
                            ) : (
                              `${field.value.length} role${field.value.length === 1 ? '' : 's'} selected`
                            )}
                          </p>
                          <Badge variant="secondary" className="shrink-0">Selected</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {roles
                            .filter(role => field.value.includes(role.id))
                            .map(role => (
                              <Badge key={role.id} variant="outline">
                                {role.role_name}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="rounded-lg border-2 border-dashed p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Select the roles that will be assigned to members in this tier
                    </p>
                  </div>
                )}
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <RoleSelectionDialog
          open={showRoleDialog}
          onOpenChange={setShowRoleDialog}
          onSelect={(roleIds) => {
            form.setValue('roles', roleIds);
          }}
          groupId={groupId}
          selectedRoleIds={form.getValues('roles')}
        />

        <Button type="submit" className="w-full" disabled={pending}>
          {pending 
            ? "Saving..." 
            : tier 
              ? membershipType === MembershipFormType.MEMBER 
                ? "Update Membership Plan" 
                : "Update Affiliation Plan"
              : membershipType === MembershipFormType.MEMBER 
                ? "Create Membership Plan" 
                : "Create Affiliation Plan"
          }
        </Button>
      </form>
    </Form>
  );
} 