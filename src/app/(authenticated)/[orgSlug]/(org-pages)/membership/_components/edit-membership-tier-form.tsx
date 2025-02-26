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
import { FileText, PlusCircle, Check, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getFormTemplateById } from "../../forms/_actions/form-template.action";
import { updateMembershipTierAction } from "../_actions/membership.action";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleSelectionDialog } from './role-selection-dialog';
import { getRolesAction } from '../_actions/roles.action';
import useToastActionState from "@/lib/hooks/toast-action-state.hook";

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

export function EditMembershipTierForm({ tier, groupId, onSuccess }: EditMembershipTierFormProps) {
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

  // Load form template
  useEffect(() => {
    const loadFormTemplate = async () => {
      const formTemplateId = form.getValues('form_template_id');
      if (!formTemplateId) return;
      
      setIsLoadingTemplate(true);
      try {
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

  // Load roles
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
    }
  }, [groupId]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append('id', tier.id);
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
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Basic Information</h3>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel>Active</FormLabel>
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
                      className="min-h-[100px]"
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
                  <FormLabel>Duration (months)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Activation Settings</h3>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="requires_form"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Require application form</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requires_review"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Require admin review</FormLabel>
                  </FormItem>
                )}
              />

              {form.watch('requires_review') && form.watch('price') > 0 && (
                <FormField
                  control={form.control}
                  name="review_before_payment"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Review before payment</FormLabel>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="mt-4">
              <Label>Current activation flow</Label>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {ACTIVATION_TYPE_DESCRIPTIONS[
                    getActivationType({
                      price: form.watch('price'),
                      requires_form: form.watch('requires_form'),
                      requires_review: form.watch('requires_review'),
                      review_before_payment: form.watch('review_before_payment')
                    })
                  ]}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Member ID Format</h3>
            <FormField
              control={form.control}
              name="member_id_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Format</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <p className="text-sm text-muted-foreground mt-2">
                    Available tokens: {'{SEQ:n}'} for sequence number, {'{YYYY}'} for year,{' '}
                    {'{YY}'} for 2-digit year, {'{MM}'} for month, {'{DD}'} for day
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {form.watch('requires_form') && (
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Application Form</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowFormTemplateDialog(true)}
                >
                  {selectedTemplate ? (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Change Form
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Select Form
                    </>
                  )}
                </Button>
              </div>

              {selectedTemplate ? (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start gap-4">
                    <FileText className="w-5 h-5 mt-0.5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{selectedTemplate.title}</h4>
                      {selectedTemplate.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedTemplate.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground" />
                  <h4 className="font-medium mt-3">No form selected</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click the button above to select an application form
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Member Roles</h3>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRoleDialog(true)}
              >
                {selectedRoles.length > 0 ? (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Change Roles
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Roles
                  </>
                )}
              </Button>
            </div>

            {selectedRoleDetails.length > 0 ? (
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {selectedRoleDetails.map(role => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-muted-foreground" />
                        <span>{role.role_name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRole(role.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <Shield className="w-8 h-8 mx-auto text-muted-foreground" />
                <h4 className="font-medium mt-3">No roles assigned</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Click the button above to assign roles to this membership tier
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

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
          setShowFormTemplateDialog(false);
        }}
        orgId={groupId}
        selectedTemplateId={form.watch('form_template_id')}
      />

      <RoleSelectionDialog
        open={showRoleDialog}
        onOpenChange={setShowRoleDialog}
        onSelect={handleRoleSelect}
        groupId={groupId}
        selectedRoleIds={selectedRoles}
      />
    </Form>
  );
} 