"use client";

import React, { useEffect } from "react";
import { Info, DollarSign, Building2, Calendar, FileText, Users, InfoIcon, FingerprintIcon, CreditCard, Settings, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormDescription, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTierForm } from "./TierFormContext";
import { OrganizationRelationshipTypePreset } from "@/lib/types/organization";
import { MembershipActivationType } from "@/lib/types/membership";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Section component with an icon and title
export function FormSection({ 
  icon: Icon, 
  title, 
  description, 
  children 
}: { 
  icon: React.ElementType; 
  title: string; 
  description?: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="grid gap-3 pl-6">{children}</div>
    </div>
  );
}

// Basic Information section (name, description)
export function BasicInfoFields() {
  const { form } = useTierForm();
  
  return (
    <FormSection icon={Info} title="Basic Information">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tier Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Gold Tier" {...field} />
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
                placeholder="What benefits does this tier provide?"
                className="resize-none" 
                rows={3} 
                {...field} 
                value={field.value || ""}
              />
            </FormControl>
            <FormDescription>
              Describe the benefits and features of this tier
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}

// Price fields (for both tier types)
export function PriceFields() {
  const { form, tierType } = useTierForm();
  
  return (
    <FormSection icon={CreditCard} title="Pricing">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
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
                    placeholder="0" 
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      const numValue = value === "" ? 0 : parseFloat(value);
                      field.onChange(numValue);
                      
                      // If this is a membership tier, update the activation type based on price
                      if (tierType === 'membership') {
                        const currentActivationType = form.getValues('activation_type');
                        const isFree = numValue === 0;
                        const isBecameFree = isFree && [
                          MembershipActivationType.PAYMENT_REQUIRED,
                          MembershipActivationType.FORM_THEN_PAYMENT,
                          MembershipActivationType.REVIEW_THEN_PAYMENT,
                          MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
                          MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
                        ].includes(currentActivationType as MembershipActivationType);
                        
                        const isBecamePaid = !isFree && [
                          MembershipActivationType.AUTOMATIC,
                          MembershipActivationType.REVIEW_REQUIRED,
                          MembershipActivationType.FORM_REQUIRED,
                          MembershipActivationType.FORM_THEN_REVIEW
                        ].includes(currentActivationType as MembershipActivationType);
                        
                        // Update activation type based on price change
                        if (isBecameFree) {
                          if (currentActivationType === MembershipActivationType.PAYMENT_REQUIRED) {
                            form.setValue('activation_type', MembershipActivationType.AUTOMATIC);
                            form.setValue('requires_form', false);
                            form.setValue('requires_review', false);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.FORM_THEN_PAYMENT) {
                            form.setValue('activation_type', MembershipActivationType.FORM_REQUIRED);
                            form.setValue('requires_form', true);
                            form.setValue('requires_review', false);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.REVIEW_THEN_PAYMENT) {
                            form.setValue('activation_type', MembershipActivationType.REVIEW_REQUIRED);
                            form.setValue('requires_form', false);
                            form.setValue('requires_review', true);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW) {
                            form.setValue('activation_type', MembershipActivationType.FORM_THEN_REVIEW);
                            form.setValue('requires_form', true);
                            form.setValue('requires_review', true);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT) {
                            form.setValue('activation_type', MembershipActivationType.FORM_THEN_REVIEW);
                            form.setValue('requires_form', true);
                            form.setValue('requires_review', true);
                            form.setValue('review_before_payment', false);
                          }
                        } else if (isBecamePaid) {
                          if (currentActivationType === MembershipActivationType.AUTOMATIC) {
                            form.setValue('activation_type', MembershipActivationType.PAYMENT_REQUIRED);
                            form.setValue('requires_form', false);
                            form.setValue('requires_review', false);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.FORM_REQUIRED) {
                            form.setValue('activation_type', MembershipActivationType.FORM_THEN_PAYMENT);
                            form.setValue('requires_form', true);
                            form.setValue('requires_review', false);
                            form.setValue('review_before_payment', false);
                          } else if (currentActivationType === MembershipActivationType.REVIEW_REQUIRED) {
                            form.setValue('activation_type', MembershipActivationType.REVIEW_THEN_PAYMENT);
                            form.setValue('requires_form', false);
                            form.setValue('requires_review', true);
                            form.setValue('review_before_payment', true);
                          } else if (currentActivationType === MembershipActivationType.FORM_THEN_REVIEW) {
                            form.setValue('activation_type', MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT);
                            form.setValue('requires_form', true);
                            form.setValue('requires_review', true);
                            form.setValue('review_before_payment', true);
                          }
                        }
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>
                  {tierType === 'membership' ? 'Price per member' : 'Price per organization'}
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
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                    <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                    <SelectItem value="CAD">Canadian Dollar (CAD)</SelectItem>
                    <SelectItem value="AUD">Australian Dollar (AUD)</SelectItem>
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
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? 1 : parseInt(value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </FormSection>
  );
}

// Organization relationship type field
export function RelationshipTypeField() {
  const { form, tierType } = useTierForm();
  
  if (tierType !== 'organization') {
    return null;
  }
  
  return (
    <FormSection icon={Building2} title="Relationship Type">
      <FormField
        control={form.control}
        name="relationship_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type of Affiliation</FormLabel>
            <Select 
              onValueChange={field.onChange} 
              defaultValue={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value={OrganizationRelationshipTypePreset.AFFILIATE}>Affiliate</SelectItem>
                <SelectItem value={OrganizationRelationshipTypePreset.CHAPTER}>Chapter</SelectItem>
                <SelectItem value={OrganizationRelationshipTypePreset.REGIONAL}>Regional</SelectItem>
                <SelectItem value={OrganizationRelationshipTypePreset.STUDENT}>Student</SelectItem>
                <SelectItem value={OrganizationRelationshipTypePreset.INDUSTRY}>Industry Partner</SelectItem>
                <SelectItem value={OrganizationRelationshipTypePreset.PARTNER}>Partner</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              This defines how the affiliate organization will relate to yours
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormSection>
  );
}

// Member ID format field (membership tiers only)
export function MemberIdFormatField() {
  const { form, tierType } = useTierForm();
  
  if (tierType !== 'membership') {
    return null;
  }
  
  return (
    <FormSection icon={FingerprintIcon} title="Member ID Format">
      <FormField
        control={form.control}
        name="member_id_format"
        render={({ field }) => (
          <FormItem>
            <FormLabel>ID Format Pattern</FormLabel>
            <FormControl>
              <Input 
                placeholder="MEM-{YYYY}-{SEQ:3}" 
                {...field} 
              />
            </FormControl>
            <FormDescription>
              Define a pattern for member IDs. Example: MEM-2024-001
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="mt-3 p-3 bg-muted/30 rounded-md border">
        <h4 className="text-xs font-medium mb-1.5">Available Tokens:</h4>
        <ul className="space-y-1 text-xs">
          <li className="flex gap-2 items-center">
            <code className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs">{"{SEQ:n}"}</code>
            <span className="text-muted-foreground text-xs">Sequential number (n = number of digits)</span>
          </li>
          <li className="flex gap-2 items-center">
            <code className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs">{"{YYYY}"}</code>
            <span className="text-muted-foreground text-xs">Four-digit year (e.g., 2024)</span>
          </li>
          <li className="flex gap-2 items-center">
            <code className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs">{"{YY}"}</code>
            <span className="text-muted-foreground text-xs">Two-digit year (e.g., 24)</span>
          </li>
          <li className="flex gap-2 items-center">
            <code className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs">{"{MM}"}</code>
            <span className="text-muted-foreground text-xs">Two-digit month (01-12)</span>
          </li>
          <li className="flex gap-2 items-center">
            <code className="bg-muted rounded-sm px-1 py-0.5 font-mono text-xs">{"{DD}"}</code>
            <span className="text-muted-foreground text-xs">Two-digit day (01-31)</span>
          </li>
        </ul>
      </div>
    </FormSection>
  );
}

// Roles field (membership only)
export function RolesField() {
  const { 
    form, 
    tierType, 
    roles, 
    selectedRoles, 
    setSelectedRoles, 
    showRoleDialog, 
    setShowRoleDialog,
    onSelectRoles,
    loading
  } = useTierForm();
  
  // Log the roles and selectedRoles for debugging
  useEffect(() => {
    console.log('RolesField - roles:', roles);
    console.log('RolesField - selectedRoles:', selectedRoles);
    console.log('RolesField - form roles value:', form.getValues('roles'));
  }, [roles, selectedRoles, form]);
  
  // Only show for membership tiers
  if (tierType !== 'membership') {
    return null;
  }
  
  const selectedRoleIds = form.watch('roles') || [];
  console.log('RolesField - selectedRoleIds from watch:', selectedRoleIds);
  
  const selectedRoleNames = selectedRoleIds
    .map((id: string) => {
      const foundRole = roles.find(role => role.id === id);
      console.log('Looking for role with ID:', id, 'Found:', foundRole);
      return foundRole?.name || id;
    })
    .filter(Boolean);
    
  console.log('RolesField - selectedRoleNames:', selectedRoleNames);
  
  return (
    <FormSection icon={Users} title="Role Assignment">
      <FormField
        control={form.control}
        name="roles"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Roles for Members</FormLabel>
            <FormControl>
              <Button
                type="button"
                variant={field.value?.length > 0 ? "outline" : "default"}
                className="w-full text-left justify-start font-normal"
                onClick={() => setShowRoleDialog(true)}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading roles...
                  </span>
                ) : field.value?.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {field.value.length} role{field.value.length !== 1 ? 's' : ''} selected
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Select roles
                  </span>
                )}
              </Button>
            </FormControl>
            <FormDescription>
              {selectedRoleNames.length > 0 
                ? `Selected roles: ${selectedRoleNames.join(', ')}`
                : "Members will be assigned these roles when their membership is approved"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {showRoleDialog && (
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Roles</DialogTitle>
              <DialogDescription>
                Choose roles that will be assigned to members when their membership is approved
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto py-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No roles found. Please create roles in your organization settings first.
                </div>
              ) : (
                <div className="space-y-4">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`role-${role.id}`}
                        checked={selectedRoleIds.includes(role.id)}
                        onCheckedChange={(checked) => {
                          console.log('Checkbox changed for role:', role.name || role.role_name, 'ID:', role.id, 'Checked:', checked);
                          
                          // Update selectedRoleIds directly for this component
                          const newSelected = checked
                            ? [...selectedRoleIds, role.id]
                            : selectedRoleIds.filter((roleId: string) => roleId !== role.id);
                          
                          console.log('New selected roles:', newSelected);
                          
                          // Update form value immediately so it's available in this component
                          form.setValue('roles', newSelected, { shouldValidate: true });
                          setSelectedRoles(newSelected);
                        }}
                      />
                      <label 
                        htmlFor={`role-${role.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {role.name || role.role_name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRoleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  console.log('Save Selection clicked - selectedRoleIds:', selectedRoleIds);
                  onSelectRoles(selectedRoleIds);
                }}
                disabled={loading}
              >
                Save Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </FormSection>
  );
}

// Form template field (for both tier types)
export function FormTemplateField() {
  const { 
    form, 
    showFormTemplateDialog, 
    setShowFormTemplateDialog, 
    formTemplates,
    requires_form,
    tierType,
    onSelectFormTemplate,
    loading
  } = useTierForm();
  
  const activationType = form.watch('activation_type');
  const showFormField = requires_form || 
    (activationType && [
      MembershipActivationType.FORM_REQUIRED,
      MembershipActivationType.FORM_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
    ].includes(activationType as MembershipActivationType));
  
  if (!showFormField) {
    return null;
  }
  
  const selectedTemplateId = form.watch('form_template_id');
  const selectedTemplate = formTemplates.find(t => t.id === selectedTemplateId);
  const hasError = !!form.formState.errors.form_template_id;
  
  // Validate the field if requires_form is true
  React.useEffect(() => {
    if (requires_form && !selectedTemplateId) {
      form.setError("form_template_id", {
        type: "manual",
        message: "Please select a form template"
      });
    } else if (form.formState.errors.form_template_id) {
      form.clearErrors("form_template_id");
    }
  }, [requires_form, selectedTemplateId, form]);
  
  return (
    <FormSection icon={FileText} title="Application Form">
      <FormField
        control={form.control}
        name="form_template_id"
        rules={{
          validate: value => {
            if (requires_form && !value) {
              return "Form template is required when application form is enabled";
            }
            return true;
          }
        }}
        render={({ field }) => (
          <FormItem>
            <FormLabel className={requires_form ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
              Application Form Template
            </FormLabel>
            <FormControl>
              <Button
                type="button"
                variant={field.value ? "outline" : "default"}
                className={cn(
                  "w-full text-left justify-start font-normal",
                  hasError && "border-red-500"
                )}
                onClick={() => setShowFormTemplateDialog(true)}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Loading templates...
                  </span>
                ) : field.value && selectedTemplate ? (
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {selectedTemplate.name || selectedTemplate.title}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {requires_form ? "Required - Select a form template" : "Select a form template"}
                  </span>
                )}
              </Button>
            </FormControl>
            <FormDescription>
              {requires_form 
                ? "Applicants must complete this form when applying" 
                : "Applicants will need to complete this form when applying"}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {showFormTemplateDialog && (
        <Dialog open={showFormTemplateDialog} onOpenChange={setShowFormTemplateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select Form Template</DialogTitle>
              <DialogDescription>
                Choose a form template that applicants will need to complete
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[300px] overflow-y-auto py-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent" />
                </div>
              ) : formTemplates.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No form templates found. Please create form templates in your organization settings first.
                </div>
              ) : (
                <div className="space-y-4">
                  {formTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className={cn(
                        "flex items-center p-3 border rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground",
                        selectedTemplateId === template.id && "border-primary bg-accent"
                      )}
                      onClick={() => {
                        onSelectFormTemplate(template.id);
                        // Clear any validation errors when a template is selected
                        if (form.formState.errors.form_template_id) {
                          form.clearErrors("form_template_id");
                        }
                        setShowFormTemplateDialog(false);
                      }}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{template.name || template.title}</p>
                        <p className="text-sm text-muted-foreground">{template.description || 'No description'}</p>
                      </div>
                      {selectedTemplateId === template.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFormTemplateDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </FormSection>
  );
}

// Activation process fields
export function ActivationProcessFields() {
  const { form, tierType } = useTierForm();
  const price = form.watch('price');
  const isFree = price === 0;
  
  // For membership tiers, we need to display the available activation processes with toggles
  if (tierType === 'membership') {
    // Get current form values or set defaults
    const requiresForm = form.watch('requires_form') || false;
    const requiresReview = form.watch('requires_review') || false;
    const reviewBeforePayment = form.watch('review_before_payment') || false;
    
    // Determine activation type based on toggles and price
    const updateActivationType = (formValue: boolean, reviewValue: boolean, reviewBeforePaymentValue: boolean) => {
      let activationType = MembershipActivationType.AUTOMATIC;
      
      if (isFree) {
        if (formValue && reviewValue) {
          activationType = MembershipActivationType.FORM_THEN_REVIEW;
        } else if (formValue) {
          activationType = MembershipActivationType.FORM_REQUIRED;
        } else if (reviewValue) {
          activationType = MembershipActivationType.REVIEW_REQUIRED;
        }
      } else {
        // For paid tiers
        if (formValue && reviewValue) {
          activationType = reviewBeforePaymentValue 
            ? MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
            : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
        } else if (formValue) {
          activationType = MembershipActivationType.FORM_THEN_PAYMENT;
        } else if (reviewValue) {
          activationType = reviewBeforePaymentValue
            ? MembershipActivationType.REVIEW_THEN_PAYMENT
            : MembershipActivationType.PAYMENT_REQUIRED;
        } else {
          activationType = MembershipActivationType.PAYMENT_REQUIRED;
        }
      }
      
      form.setValue('activation_type', activationType);
    };
    
    const handleToggleChange = (field: 'requires_form' | 'requires_review' | 'review_before_payment') => {
      const currentValue = form.getValues(field);
      const newValue = !currentValue;
      form.setValue(field, newValue);
      
      // Get updated values for all fields
      const updatedFormValue = field === 'requires_form' ? newValue : requiresForm;
      const updatedReviewValue = field === 'requires_review' ? newValue : requiresReview;
      const updatedReviewBeforePaymentValue = field === 'review_before_payment' ? newValue : reviewBeforePayment;
      
      // Update activation type based on new values
      updateActivationType(updatedFormValue, updatedReviewValue, updatedReviewBeforePaymentValue);
    };
    
    return (
      <FormSection icon={Settings} title="Activation Process">
        <div className="space-y-4">
          {/* Current activation type display (read-only) */}
          <FormField
            control={form.control}
            name="activation_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Activation Flow</FormLabel>
                <FormControl>
                  <div className="p-2 border rounded-md bg-muted/50">
                    <p className="text-sm font-medium">
                      {field.value === MembershipActivationType.AUTOMATIC && "Automatic Approval"}
                      {field.value === MembershipActivationType.REVIEW_REQUIRED && "Manual Review Required"}
                      {field.value === MembershipActivationType.PAYMENT_REQUIRED && "Payment Required"}
                      {field.value === MembershipActivationType.REVIEW_THEN_PAYMENT && "Manual Review → Payment"}
                      {field.value === MembershipActivationType.FORM_REQUIRED && "Application Form Required"}
                      {field.value === MembershipActivationType.FORM_THEN_PAYMENT && "Application Form → Payment"}
                      {field.value === MembershipActivationType.FORM_THEN_REVIEW && "Application Form → Manual Review"}
                      {field.value === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW && "Application Form → Payment → Manual Review"}
                      {field.value === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT && "Application Form → Manual Review → Payment"}
                    </p>
                  </div>
                </FormControl>
                <FormDescription>
                  Steps required for an applicant to become a member
                </FormDescription>
              </FormItem>
            )}
          />
          
          {/* Hidden fields that store the actual values */}
          <input type="hidden" {...form.register('requires_form')} />
          <input type="hidden" {...form.register('requires_review')} />
          <input type="hidden" {...form.register('review_before_payment')} />
          
          {/* Application Form Toggle */}
          <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
            <Switch
              checked={requiresForm}
              onCheckedChange={() => handleToggleChange('requires_form')}
              id="requires_form_toggle"
            />
            <div className="space-y-1">
              <label 
                htmlFor="requires_form_toggle" 
                className="font-medium cursor-pointer"
              >
                Application Form
              </label>
              <p className="text-sm text-muted-foreground">
                Require members to complete an application form before joining
              </p>
            </div>
          </div>
          
          {/* Admin Review Toggle */}
          <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
            <Switch
              checked={requiresReview}
              onCheckedChange={() => handleToggleChange('requires_review')}
              id="requires_review_toggle"
            />
            <div className="space-y-1">
              <label 
                htmlFor="requires_review_toggle" 
                className="font-medium cursor-pointer"
              >
                Admin Review
              </label>
              <p className="text-sm text-muted-foreground">
                Require admin approval before membership is granted
              </p>
            </div>
          </div>
          
          {/* Review Before Payment Toggle - only show for paid tiers with review enabled */}
          {requiresReview && !isFree && (
            <div className="flex flex-row items-start space-x-4 space-y-0 rounded-md border p-4">
              <Switch
                checked={reviewBeforePayment}
                onCheckedChange={() => handleToggleChange('review_before_payment')}
                id="review_before_payment_toggle"
              />
              <div className="space-y-1">
                <label 
                  htmlFor="review_before_payment_toggle" 
                  className="font-medium cursor-pointer"
                >
                  Review Before Payment
                </label>
                <p className="text-sm text-muted-foreground">
                  Review applications before allowing members to pay
                </p>
              </div>
            </div>
          )}
        </div>
      </FormSection>
    );
  }
  
  // For organization tiers
  if (tierType === 'organization') {
    return (
      <FormSection icon={Settings} title="Activation Process">
        <FormField
          control={form.control}
          name="requires_review"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Require manual review
                </FormLabel>
                <FormDescription>
                  Organizations will need to be manually approved before affiliation is active
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      </FormSection>
    );
  }
  
  return null;
}

// Divider component
export function FormDivider() {
  return <Separator className="my-6" />;
} 