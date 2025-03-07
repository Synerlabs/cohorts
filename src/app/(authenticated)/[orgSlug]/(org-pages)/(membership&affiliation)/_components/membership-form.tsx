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
import { FileText, PlusCircle, Check, Shield, Clock, DollarSign, ArrowRight, ActivityIcon, CheckCircle, CalendarRange, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { getFormTemplateById } from "../../forms/_actions/form-template.action";
import { createMembershipTierAction, updateMembershipTierAction } from "../_actions/membership.action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleSelectionDialog } from './role-selection-dialog';
import { getRolesAction } from '../_actions/roles.action';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import { format, addMonths, addYears } from 'date-fns';
import { calculateMembershipDates, calculatePartialPeriodInfo, isValidJoinDate } from '@/lib/utils/membership-dates';

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
  duration_months: z.number().min(1, "Duration must be at least 1"),
  duration_unit: z.enum(['month', 'year'] as const).default('month'),
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
  // New fields for enhanced duration
  has_fixed_dates: z.boolean().default(false),
  fixed_start_date: z.string().optional().nullable(),
  fixed_end_date: z.string().optional().nullable(),
  is_fiscal_period: z.boolean().default(false),
  fiscal_start_month: z.number().min(1).max(12).optional().nullable(),
  fiscal_start_day: z.number().min(1).max(31).optional().nullable(),
  // Monthly cycle settings
  has_monthly_cycle: z.boolean().default(false),
  monthly_start_day: z.number().min(1).max(31).optional().nullable(),
  monthly_end_day_type: z.enum(['specific', 'last_day']).default('specific'),
  monthly_end_day: z.number().min(1).max(31).optional().nullable(),
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
      name: tier?.name || "",
      description: tier?.description || "",
      price: tier?.price || 0,
      currency: tier?.currency || "USD",
      duration_months: tier?.membership_tier?.duration_months || 1,
      duration_unit: tier?.membership_tier?.duration_unit || 'month',
      ...getStepConfiguration(tier?.membership_tier?.activation_type as MembershipActivationType || MembershipActivationType.AUTOMATIC),
      member_id_format: tier?.membership_tier?.member_id_format || 'MEM-{YYYY}-{SEQ:3}',
      form_template_id: tier?.membership_tier?.form_template_id || null,
      roles: [],
      has_fixed_dates: tier?.membership_tier?.has_fixed_dates || false,
      fixed_start_date: tier?.membership_tier?.fixed_start_date || null,
      fixed_end_date: tier?.membership_tier?.fixed_end_date || null,
      is_fiscal_period: tier?.membership_tier?.is_fiscal_period || false,
      fiscal_start_month: tier?.membership_tier?.fiscal_start_month || null,
      fiscal_start_day: tier?.membership_tier?.fiscal_start_day || null,
      has_monthly_cycle: tier?.membership_tier?.has_monthly_cycle || false,
      monthly_start_day: tier?.membership_tier?.monthly_start_day || null,
      monthly_end_day_type: tier?.membership_tier?.monthly_end_day_type || 'specific',
      monthly_end_day: tier?.membership_tier?.monthly_end_day || null,
    },
  });

  // Initialize form with tier data when it's loaded
  useEffect(() => {
    if (tier && tier.membership_tier) {
      // Set duration tab fields
      form.setValue('has_fixed_dates', tier.membership_tier.has_fixed_dates || false);
      form.setValue('fixed_start_date', tier.membership_tier.fixed_start_date || null);
      form.setValue('fixed_end_date', tier.membership_tier.fixed_end_date || null);
      form.setValue('is_fiscal_period', tier.membership_tier.is_fiscal_period || false);
      form.setValue('fiscal_start_month', tier.membership_tier.fiscal_start_month || null);
      form.setValue('fiscal_start_day', tier.membership_tier.fiscal_start_day || null);
      form.setValue('has_monthly_cycle', tier.membership_tier.has_monthly_cycle || false);
      form.setValue('monthly_start_day', tier.membership_tier.monthly_start_day || null);
      form.setValue('monthly_end_day_type', tier.membership_tier.monthly_end_day_type || 'specific');
      form.setValue('monthly_end_day', tier.membership_tier.monthly_end_day || null);
      form.setValue('duration_unit', tier.membership_tier.duration_unit || 'month');
    }
  }, [tier, form]);

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

  // Add a function to determine which tab should be active
  const getDurationTabValue = () => {
    if (form.watch('is_fiscal_period')) {
      return 'fiscal-period';
    } else if (form.watch('has_fixed_dates')) {
      return 'fixed-dates';
    } else {
      return 'standard';
    }
  };

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
          formData.append("duration_unit", values.duration_unit);
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
          formData.append("has_fixed_dates", values.has_fixed_dates.toString());
          formData.append("fixed_start_date", values.fixed_start_date || "");
          formData.append("fixed_end_date", values.fixed_end_date || "");
          formData.append("is_fiscal_period", values.is_fiscal_period.toString());
          formData.append("fiscal_start_month", values.fiscal_start_month?.toString() || "");
          formData.append("fiscal_start_day", values.fiscal_start_day?.toString() || "");
          formData.append("has_monthly_cycle", values.has_monthly_cycle.toString());
          formData.append("monthly_start_day", values.monthly_start_day?.toString() || "");
          formData.append("monthly_end_day_type", values.monthly_end_day_type);
          formData.append("monthly_end_day", values.monthly_end_day?.toString() || "");

          action(formData);
        });
      })}>
        <div className="relative">
          {/* Floating preview panels - positioned outside the form on the left */}
          <div className="hidden lg:block" style={{ position: 'fixed', width: '280px', right: 'calc(50% + 360px)', top: '120px', maxHeight: '80vh', overflowY: 'auto', zIndex: 10 }}>
            <div className="space-y-4">
              {/* Activation Flow Visualization */}
              <div className="border rounded-md shadow-sm bg-background overflow-hidden">
                <div className="bg-muted/30 p-3 border-b">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <ActivityIcon size={16} className="text-primary" />
                    Activation Flow
                  </h3>
                </div>
                <div className="p-3">
                  <div className="flex flex-col gap-2 text-sm">
                    <div className="text-muted-foreground text-xs mb-2">
                      Members will go through these steps:
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
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
                    <div className="mt-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
                      {ACTIVATION_TYPE_DESCRIPTIONS[activationType]}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Duration Preview */}
              <div className="border rounded-md shadow-sm bg-background overflow-hidden">
                <div className="bg-muted/30 p-3 border-b">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Clock size={16} className="text-primary" />
                    Duration Preview
                  </h3>
                </div>
                <div className="p-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground text-xs mb-1 block">If a member joins today:</span>
                    {(() => {
                      const today = new Date();
                      const durationMonths = form.watch('duration_months') || 1;
                      const durationUnit = form.watch('duration_unit') || 'month';
                      const hasFixedDates = form.watch('has_fixed_dates') || false;
                      const fixedStartDate = form.watch('fixed_start_date');
                      const fixedEndDate = form.watch('fixed_end_date');
                      const isFiscalPeriod = form.watch('is_fiscal_period') || false;
                      const fiscalStartMonth = form.watch('fiscal_start_month');
                      const fiscalStartDay = form.watch('fiscal_start_day');
                      const hasMonthlyCycle = form.watch('has_monthly_cycle') || false;
                      const monthlyStartDay = form.watch('monthly_start_day');
                      const monthlyEndDayType = form.watch('monthly_end_day_type') || 'specific';
                      const monthlyEndDay = form.watch('monthly_end_day');
                      
                      // Use the shared utility to calculate dates and display preview
                      try {
                        const tierSettings = {
                          duration_months: durationMonths,
                          duration_unit: durationUnit,
                          has_fixed_dates: hasFixedDates,
                          fixed_start_date: fixedStartDate,
                          fixed_end_date: fixedEndDate,
                          is_fiscal_period: isFiscalPeriod,
                          fiscal_start_month: fiscalStartMonth,
                          fiscal_start_day: fiscalStartDay,
                          has_monthly_cycle: hasMonthlyCycle,
                          monthly_start_day: monthlyStartDay,
                          monthly_end_day_type: monthlyEndDayType,
                          monthly_end_day: monthlyEndDay
                        };
                        
                        // Case 1: Has fixed dates
                        if (hasFixedDates && fixedStartDate && fixedEndDate) {
                          const isJoinDateValid = isValidJoinDate(tierSettings, today);
                          const { startDate, endDate } = calculateMembershipDates(tierSettings, today);
                          
                          // Calculate duration in days
                          const daysUntilEnd = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <div className="mt-1 font-medium">
                              {isJoinDateValid ? (
                                <p>Members will have a fixed membership period from <span className="text-primary">{format(startDate, 'MMM d, yyyy')}</span> to <span className="text-primary">{format(endDate, 'MMM d, yyyy')}</span></p>
                              ) : (
                                <p className="text-destructive">Warning: The fixed end date is in the past. New members would have an expired membership.</p>
                              )}
                            </div>
                          );
                        }
                        
                        // Case 2: Is fiscal period
                        else if (isFiscalPeriod && fiscalStartMonth && fiscalStartDay) {
                          const { startDate, endDate } = calculateMembershipDates(tierSettings, today);
                          
                          return (
                            <div className="mt-1 font-medium">
                              <p>Based on your fiscal year starting <span className="text-primary">{format(new Date(today.getFullYear(), fiscalStartMonth - 1, fiscalStartDay), 'MMM d')}</span>, a member joining today would have membership until <span className="text-primary">{format(endDate, 'MMM d, yyyy')}</span></p>
                            </div>
                          );
                        }
                        
                        // Case 3: Monthly cycle
                        else if (durationUnit === 'month' && hasMonthlyCycle && monthlyStartDay) {
                          const { startDate, endDate } = calculateMembershipDates(tierSettings, today);
                          const { hasInitialPartialPeriod, firstFullCycleStart } = calculatePartialPeriodInfo(tierSettings, today);
                          
                          return (
                            <div className="mt-1">
                              <div className="flex items-center gap-2 mb-1 text-primary">
                                <CalendarRange size={16} />
                                <span className="font-medium">Monthly Billing Cycle</span>
                              </div>
                              <div>
                                <p className="text-sm">
                                  Memberships align with monthly cycles from
                                  day <span className="font-medium">{monthlyStartDay}</span> to
                                  {monthlyEndDayType === 'last_day' ? (
                                    <span className="font-medium"> end of month</span>
                                  ) : (
                                    <span className="font-medium"> day {monthlyEndDay}</span>
                                  )}
                                </p>
                                <p className="text-sm mt-1">
                                  Members joining mid-cycle get a partial first month.
                                </p>
                                <p className="text-sm mt-1 font-medium">
                                  Total duration: {durationMonths} {durationUnit}{durationMonths > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        
                        // Case 4: Standard duration
                        else {
                          const { startDate, endDate } = calculateMembershipDates(tierSettings, today);
                          
                          return (
                            <div className="mt-1 font-medium">
                              <p>A member joining today would have membership until <span className="text-primary">{format(endDate, 'MMM d, yyyy')}</span></p>
                            </div>
                          );
                        }
                      } catch (error) {
                        console.error('Error calculating dates:', error);
                        return <p className="mt-1 text-destructive">Error calculating membership dates</p>;
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main form content - takes the full width of its container */}
          <div className="space-y-8 w-full">
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

            <div className="border rounded-lg p-5 space-y-6">
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
                  if (checked && form.getValues("price") === 0) {
                    form.setValue("price", 1);
                  } else if (!checked) {
                    form.setValue("price", 0);
                  }
                }}
              />
            </div>
            
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
                                
                                if (numValue === 0) {
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
          
            <div className="mt-6 space-y-3">
              <div className="flex items-start">
                <div className="text-lg font-medium flex items-center gap-2">
                  <Clock size={16} className="text-primary" />
                  Membership Duration
                </div>
              </div>
            
              <div className="border rounded-md p-6 space-y-5">
                <Tabs 
                  defaultValue={getDurationTabValue()} 
                  value={getDurationTabValue()}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger 
                      value="standard" 
                      onClick={() => {
                        form.setValue('has_fixed_dates', false);
                        form.setValue('is_fiscal_period', false);
                        // Ensure duration_unit has a value
                        const currentUnit = form.getValues('duration_unit');
                        if (!currentUnit) {
                          form.setValue('duration_unit', 'month');
                        }
                      }}
                    >
                      Standard
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fixed-dates"
                      onClick={() => {
                        form.setValue('has_fixed_dates', true);
                        form.setValue('is_fiscal_period', false);
                        // Ensure duration_unit has a value
                        const currentUnit = form.getValues('duration_unit');
                        if (!currentUnit) {
                          form.setValue('duration_unit', 'month');
                        }
                      }}
                    >
                      Fixed Dates
                    </TabsTrigger>
                    <TabsTrigger 
                      value="fiscal-period"
                      onClick={() => {
                        form.setValue('has_fixed_dates', false);
                        form.setValue('is_fiscal_period', true);
                        // For fiscal period, always use year as duration unit
                        form.setValue('duration_unit', 'year');
                      }}
                    >
                      Fiscal Period
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="standard" className="mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="duration_months"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Duration</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="w-80">
                                      <p>Specify how long the membership will last</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) => {
                                      // Set tab-specific flags
                                      form.setValue('has_fixed_dates', false);
                                      form.setValue('is_fiscal_period', false);
                                      
                                      // Ensure duration_unit has a value
                                      const currentUnit = form.getValues('duration_unit');
                                      if (!currentUnit) {
                                        form.setValue('duration_unit', 'month');
                                      }
                                      
                                      field.onChange(parseInt(e.target.value) || 1);
                                    }}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="duration_unit"
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <Select
                                          value={field.value}
                                          onValueChange={(value) => {
                                            // Set tab-specific flags
                                            form.setValue('has_fixed_dates', false);
                                            form.setValue('is_fiscal_period', false);
                                            field.onChange(value);
                                          }}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Unit" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="month">Month(s)</SelectItem>
                                            <SelectItem value="year">Year(s)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                    </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
              </div>
                      <div className="text-sm text-muted-foreground">
                        <p>With this setting, memberships will last exactly {form.watch('duration_months') || 1} {form.watch('duration_unit') === 'year' ? (form.watch('duration_months') === 1 ? 'year' : 'years') : (form.watch('duration_months') === 1 ? 'month' : 'months')} from when the member joins.</p>
                        {form.watch('has_monthly_cycle') && form.watch('duration_unit') === 'month' && 
                          <p className="mt-1">Members who join mid-cycle will get a partial first month.</p>
                        }
                      </div>
                      
                      {form.watch('duration_unit') === 'month' && (
                        <div className="mt-3 border-t border-dashed pt-3">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <CalendarRange size={18} className="text-primary" />
                              <h3 className="text-sm font-medium">Monthly Billing Cycle</h3>
                            </div>
                            <FormField
                              control={form.control}
                              name="has_monthly_cycle"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormLabel className="text-sm text-muted-foreground mb-0">Enable</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
          </div>

                          {form.watch('has_monthly_cycle') ? (
                            <>
                              <div className="rounded-md border bg-card p-3 mb-2">
                                <p className="text-xs text-muted-foreground mb-3">
                                  Align memberships with specific days of the month for more predictable billing cycles.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div>
        <FormField
          control={form.control}
                                      name="monthly_start_day"
          render={({ field }) => (
            <FormItem>
                                          <FormLabel className="text-sm font-medium block mb-1.5">Cycle Start Day</FormLabel>
              <FormControl>
                <Input
                  type="number"
                                              min={1}
                                              max={28}
                  {...field}
                                              value={field.value || ''}
                                              onChange={(e) => field.onChange(parseInt(e.target.value) || '')}
                                              className="h-9"
                                              placeholder="e.g., 1"
                                            />
                                          </FormControl>
                                          <FormDescription className="text-xs mt-1.5">
                                            Day of month when cycles begin
                                          </FormDescription>
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  
                                  <div>
                                    <FormField
                                      control={form.control}
                                      name="monthly_end_day_type"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-sm font-medium block mb-1.5">Cycle End Type</FormLabel>
                                          <Select 
                                            onValueChange={field.onChange} 
                                            value={field.value}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Select end type" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="specific">Specific Day</SelectItem>
                                              <SelectItem value="last_day">Last Day of Month</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormDescription className="text-xs mt-1.5">
                                            How to determine cycle end
                                          </FormDescription>
                                        </FormItem>
                                      )}
                                    />
                                    
                                    {form.watch('monthly_end_day_type') === 'specific' && (
                                      <FormField
                                        control={form.control}
                                        name="monthly_end_day"
                                        render={({ field }) => (
                                          <FormItem className="mt-3">
                                            <FormLabel className="text-sm font-medium block mb-1.5">End Day</FormLabel>
                                            <FormControl>
                                              <Input
                                                type="number"
                                                min={1}
                                                max={31}
                                                {...field}
                                                value={field.value || ''}
                  onChange={(e) => {
                                                  // Also update the tab-specific flags
                                                  form.setValue('has_fixed_dates', true);
                                                  form.setValue('is_fiscal_period', false);
                                                  // Maintain duration_unit
                                                  const currentUnit = form.getValues('duration_unit');
                                                  if (!currentUnit) {
                                                    form.setValue('duration_unit', 'month');
                                                  }
                                                  field.onChange(parseInt(e.target.value) || '');
                                                }}
                                                className="h-9"
                                                placeholder="e.g., 31"
                />
              </FormControl>
                                            <FormDescription className="text-xs mt-1.5">
                                              Day before next cycle starts
              </FormDescription>
            </FormItem>
          )}
        />
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mt-3">
                                With this setting, memberships will align with monthly billing cycles. Members who join mid-cycle will get a partial first month.
                                Total duration: {form.watch('duration_months') || 1} {form.watch('duration_unit')}{form.watch('duration_months') > 1 ? 's' : ''}.
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground p-3 border border-dashed rounded-md bg-muted/30 flex items-center gap-2">
                              <Info size={14} className="text-muted-foreground" />
                              Enable this option to align memberships with specific days of the month for more predictable billing cycles.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                    
                  <TabsContent value="fixed-dates" className="mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fixed_start_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Also update the tab-specific flags
                                    form.setValue('has_fixed_dates', true);
                                    form.setValue('is_fiscal_period', false);
                                    // Maintain duration_unit
                                    const currentUnit = form.getValues('duration_unit');
                                    if (!currentUnit) {
                                      form.setValue('duration_unit', 'month');
                                    }
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="fixed_end_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Also update the tab-specific flags
                                    form.setValue('has_fixed_dates', true);
                                    form.setValue('is_fiscal_period', false);
                                    // Maintain duration_unit
                                    const currentUnit = form.getValues('duration_unit');
                                    if (!currentUnit) {
                                      form.setValue('duration_unit', 'month');
                                    }
                                    field.onChange(e.target.value);
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">
                          With this setting, all memberships will use these fixed dates regardless of when members join.
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                    
                  <TabsContent value="fiscal-period" className="mt-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="fiscal_start_month"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fiscal Start Month</FormLabel>
                              <Select
                                value={field.value?.toString() || ""}
                                onValueChange={(value) => {
                                  // Update tab-specific flags
                                  form.setValue('fiscal_start_month', parseInt(value) || null);
                                  form.setValue('is_fiscal_period', true);
                                  form.setValue('has_fixed_dates', false);
                                  // Ensure duration_unit is set to year for fiscal period
                                  form.setValue('duration_unit', 'year');
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select month" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">January</SelectItem>
                                  <SelectItem value="2">February</SelectItem>
                                  <SelectItem value="3">March</SelectItem>
                                  <SelectItem value="4">April</SelectItem>
                                  <SelectItem value="5">May</SelectItem>
                                  <SelectItem value="6">June</SelectItem>
                                  <SelectItem value="7">July</SelectItem>
                                  <SelectItem value="8">August</SelectItem>
                                  <SelectItem value="9">September</SelectItem>
                                  <SelectItem value="10">October</SelectItem>
                                  <SelectItem value="11">November</SelectItem>
                                  <SelectItem value="12">December</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="fiscal_start_day"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fiscal Start Day</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={31}
                                  placeholder="Day of month"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    // Update tab-specific flags
                                    form.setValue('fiscal_start_day', e.target.value ? parseInt(e.target.value) : null);
                                    form.setValue('is_fiscal_period', true);
                                    form.setValue('has_fixed_dates', false);
                                    // Ensure duration_unit is set to year for fiscal period
                                    form.setValue('duration_unit', 'year');
                                  }}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="col-span-2 mt-3">
                          <FormLabel className="block mb-2">Duration</FormLabel>
                          <div className="flex items-center gap-2 max-w-[300px] mb-3">
                            <FormField
                              control={form.control}
                              name="duration_months"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={e => {
                                        // Set tab-specific flags
                                        form.setValue('has_fixed_dates', false);
                                        form.setValue('is_fiscal_period', true);
                                        field.onChange(parseInt(e.target.value) || 1);
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="duration_unit"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <Select 
                                    onValueChange={(value) => {
                                      // Set tab-specific flags
                                      form.setValue('has_fixed_dates', false);
                                      form.setValue('is_fiscal_period', true);
                                      field.onChange(value);
                                    }} 
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="month">Month(s)</SelectItem>
                                      <SelectItem value="year">Year(s)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            With this setting, memberships will align with your fiscal periods. If a member joins mid-fiscal period, their membership will end at the completion of {form.watch('duration_months') || 1} {form.watch('duration_unit') === 'year' ? (form.watch('duration_months') === 1 ? 'fiscal year' : 'fiscal years') : (form.watch('duration_months') === 1 ? 'fiscal month' : 'fiscal months')}.
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

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

            <FormField
              control={form.control}
              name="has_fixed_dates"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <input 
                      type="hidden" 
                      name={field.name}
                      value={field.value ? "true" : "false"}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_fiscal_period"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <input 
                      type="hidden" 
                      name={field.name}
                      value={field.value ? "true" : "false"}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </form>
    </Form>
  );
} 