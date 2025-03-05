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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { startTransition } from "react";
import React, { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types/database.types";
import { toast } from "@/components/ui/use-toast";
import { FormTemplateSelectionDialog } from './form-template-selection-dialog';
import { FileText, PlusCircle, Check, Shield } from "lucide-react";
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
  });

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

        <div className="space-y-6 rounded-lg border p-4">
          <div className="space-y-2">
            <h3 className="font-medium">Activation Steps</h3>
            <p className="text-sm text-muted-foreground">Configure how members are activated for this tier</p>
          </div>

          <FormField
            control={form.control}
            name="requires_form"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Application Form</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Require members to complete an application form
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requires_review"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel>Admin Review</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Require admin approval before membership is granted
                  </p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {!isFree && requires_review && (
            <FormField
              control={form.control}
              name="review_before_payment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Review Before Payment</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Review applications before allowing members to pay
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Current Flow:</span>
              <span className="text-muted-foreground">
                {requires_form && "Complete Form → "}
                {requires_review && review_before_payment ? "Admin Review → " : ""}
                {!isFree && "Payment → "}
                {requires_review && !review_before_payment ? "Admin Review → " : ""}
                Membership Granted
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Activation Type: {activationType}
            </div>
          </div>
        </div>

        {requires_form && (
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
                              {isLoadingTemplate ? (
                                "Loading..."
                              ) : (
                                formTemplates.find(t => t.id === field.value)?.title || 'Form Template'
                              )}
                            </p>
                            <Badge variant="secondary" className="shrink-0">Selected</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {isLoadingTemplate ? (
                              "Loading form details..."
                            ) : (
                              formTemplates.find(t => t.id === field.value)?.description || 'No description available'
                            )}
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
                    variant={field.value.length > 0 ? "outline" : "default"}
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