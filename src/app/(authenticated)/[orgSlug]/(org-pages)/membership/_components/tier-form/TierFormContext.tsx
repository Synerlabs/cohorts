"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UseFormReturn, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MembershipActivationType } from "@/lib/types/membership";
import { OrganizationRelationshipTypePreset } from "@/lib/types/organization";
import { getRolesAction } from "../../_actions/roles.action";
import { getPublishedFormTemplates, getFormTemplateById } from "../../../forms/_actions/form-template.action";
import { toast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/utils/supabase/client";

// Define and export TierType
export type TierType = 'membership' | 'organization';

// Base tier schema that's common to all tier types
export const baseTierSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  currency: z.enum(['USD']),
  duration_months: z.number().min(1, "Duration must be at least 1 month"),
  activation_type: z.string(),
  form_template_id: z.string().optional().nullable(),
});

// Specific schemas for different tier types
export const membershipTierSchema = baseTierSchema.extend({
  member_id_format: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

export const organizationTierSchema = baseTierSchema.extend({
  relationship_type: z.string().min(1, "Relationship type is required"),
  requires_review: z.boolean().optional(),
});

// Union type for all possible tier schemas
export type TierSchema = 
  | z.infer<typeof membershipTierSchema> 
  | z.infer<typeof organizationTierSchema>;

// Type for the context
type TierFormContextType = {
  form: UseFormReturn<any>;
  tierType: TierType;
  tierData: any;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  submitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  showFormTemplateDialog: boolean;
  setShowFormTemplateDialog: (show: boolean) => void;
  formTemplates: any[];
  setFormTemplates: (templates: any[]) => void;
  roles: any[];
  setRoles: (roles: any[]) => void;
  selectedRoles: any[];
  setSelectedRoles: (roles: any[]) => void;
  showRoleDialog: boolean;
  setShowRoleDialog: (show: boolean) => void;
  isFree: boolean;
  requires_form: boolean;
  requires_review: boolean;
  review_before_payment: boolean;
  activationType: MembershipActivationType;
  onSelectFormTemplate: (templateId: string) => void;
  onSelectRoles: (roleIds: string[]) => void;
  getActivationType: (options: { price: number, requires_form: boolean, requires_review: boolean, review_before_payment: boolean }) => MembershipActivationType;
  getStepConfiguration: (type: MembershipActivationType) => { requires_form: boolean, requires_review: boolean, review_before_payment: boolean };
  onSuccess?: () => void;
  groupId: string;
};

// Create the context
const TierFormContext = createContext<TierFormContextType | undefined>(undefined);

// Props for the context provider
export interface TierFormProviderProps {
  children: React.ReactNode;
  tierType: TierType;
  groupId: string;
  initialData?: any;
  onSuccess?: () => void;
}

export function TierFormProvider({ 
  children, 
  tierType,
  groupId,
  initialData,
  onSuccess
}: TierFormProviderProps) {
  // Choose the appropriate schema based on tier type
  let schema = tierType === 'membership' ? membershipTierSchema : organizationTierSchema;
  
  // Create form with the selected schema
  const form = useForm<any>({
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price ? initialData.price / 100 : 0, // Convert from cents
      currency: initialData?.currency || "USD",
      duration_months: initialData?.duration_months || 12,
      group_id: groupId,
      ...(tierType === 'membership' ? { 
        member_id_format: initialData?.member_id_format || "", 
        roles: initialData?.roles || [],
        requires_form: initialData?.requires_form || false,
        requires_review: initialData?.requires_review || false,
        review_before_payment: initialData?.review_before_payment || false,
        form_template_id: initialData?.form_template_id || null
      } : { 
        relationship_type: initialData?.relationship_type || "",
        requires_review: initialData?.requires_review !== undefined ? initialData.requires_review : true
      }),
    }
  });

  // Form state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFormTemplateDialog, setShowFormTemplateDialog] = useState(false);
  const [formTemplates, setFormTemplates] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<any[]>([]);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Load roles when component mounts
  useEffect(() => {
    const loadRoles = async () => {
      if (tierType === 'membership' && groupId) {
        setLoading(true);
        console.log('Loading roles for group:', groupId);
        console.log('Group ID type:', typeof groupId);
        console.log('Group ID length:', groupId.length);
        
        try {
          console.log('Calling getRolesAction for group:', groupId);
          const result = await getRolesAction(groupId);
          console.log('Result from getRolesAction:', result);
          
          if (result && Array.isArray(result)) {
            console.log('Loaded roles:', result);
            setRoles(result);
            
            // If we have initialData with roles, select them
            if (initialData?.roles && Array.isArray(initialData.roles)) {
              console.log('Setting initial roles from initialData:', initialData.roles);
              setSelectedRoles(initialData.roles);
            }
          } else {
            console.warn('Invalid roles result:', result);
            setRoles([]);
          }
        } catch (error) {
          console.error('Error loading roles:', error);
          // Log additional information about the error
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          
          // Attempt direct Supabase query as fallback
          try {
            const supabase = createClient();
            const { data: roles } = await supabase
              .from('group_roles')
              .select('*')
              .eq('group_id', groupId);
            
            console.log('Fallback roles loading result:', roles);
            setRoles(roles || []);
          } catch (fallbackError) {
            console.error('Fallback roles loading failed:', fallbackError);
            setRoles([]);
          }
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadRoles();
  }, [groupId, tierType, initialData]);

  // Load form templates when component mounts
  useEffect(() => {
    const loadFormTemplates = async () => {
      if (groupId) {
        setLoading(true);
        console.log('Loading form templates for group:', groupId);
        console.log('Group ID type:', typeof groupId);
        console.log('Group ID length:', groupId.length);
        
        try {
          // Use the server action to get published form templates
          console.log('Calling getPublishedFormTemplates for group:', groupId);
          const result = await getPublishedFormTemplates(groupId);
          console.log('Result from getPublishedFormTemplates:', result);
          
          if (result.error) {
            throw new Error(`Error from getPublishedFormTemplates: ${result.error}`);
          }
          
          const templates = result.data || [];
          console.log('Loaded published form templates:', templates);
          
          // If a specific template was provided in initialData, make sure it's included
          if (initialData?.form_template_id) {
            console.log('Loading specific template from initialData:', initialData.form_template_id);
            try {
              console.log('Calling getFormTemplateById for:', initialData.form_template_id);
              const specificTemplateResult = await getFormTemplateById(initialData.form_template_id);
              console.log('Result from getFormTemplateById:', specificTemplateResult);
              
              if (specificTemplateResult.error) {
                console.warn('Error loading specific template:', specificTemplateResult.error);
              } else if (specificTemplateResult.data) {
                console.log('Loaded specific template:', specificTemplateResult.data);
                
                // Check if this template is already in the list
                const exists = templates.some((t: any) => t.id === specificTemplateResult.data.id);
                if (!exists) {
                  templates.push(specificTemplateResult.data);
                }
              }
            } catch (specificError) {
              console.error('Exception when loading specific form template:', specificError);
            }
          }
          
          setFormTemplates(templates || []);
        } catch (error) {
          console.error('Error loading form templates:', error);
          // Log additional information about the error
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          
          // Fallback: Load templates using direct fetch
          try {
            console.log('Attempting fallback template loading with Supabase client for group:', groupId);
            
            // Create a supabase client
            const supabase = createClient();
            
            // Fetch published templates directly
            const { data: templates, error: templatesError } = await supabase
              .from('form_templates')
              .select('*')
              .eq('org_id', groupId)
              .eq('status', 'published')
              .order('created_at', { ascending: false });
              
            if (templatesError) {
              throw templatesError;
            }
            
            console.log('Fallback template loading result:', templates);
            
            // If we have a specific template ID in initialData, fetch it as well
            if (initialData?.form_template_id) {
              const { data: specificTemplate, error: specificError } = await supabase
                .from('form_templates')
                .select('*')
                .eq('id', initialData.form_template_id)
                .single();
                
              if (!specificError && specificTemplate) {
                console.log('Loaded specific template via fallback:', specificTemplate);
                
                // Check if it's already in the list
                const exists = templates.some(t => t.id === specificTemplate.id);
                if (!exists) {
                  templates.push(specificTemplate);
                }
              }
            }
            
            setFormTemplates(templates || []);
            console.log('Successfully loaded templates via fallback:', templates);
          } catch (fallbackError) {
            console.error('Error in fallback template loading:', fallbackError);
            toast({
              title: "Error loading templates",
              description: "Failed to load form templates. Using empty list.",
              variant: "destructive",
            });
            setFormTemplates([]);
          } finally {
            setLoading(false);
          }
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadFormTemplates();
  }, [groupId, initialData?.form_template_id]);

  // Calculate derived state
  const values = form.watch();
  const isFree = values.price === 0;
  
  // For organization tiers
  let requires_review = tierType === 'organization' ? values.requires_review : false;
  
  // For membership tiers
  let requires_form = tierType === 'membership' ? !!values.form_template_id : false;
  let review_before_payment = false;
  
  // Dynamic derived state based on form values
  if (tierType === 'membership') {
    const activationType = values.activation_type as MembershipActivationType;
    const config = getStepConfiguration(activationType);
    requires_form = config.requires_form;
    requires_review = config.requires_review;
    review_before_payment = config.review_before_payment;
  }

  // Helper to determine activation type
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
    if (requires_form) {
      if (price > 0) {
        if (requires_review) {
          return review_before_payment
            ? MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT
            : MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW;
        }
        return MembershipActivationType.FORM_THEN_PAYMENT;
      }
      if (requires_review) {
        return MembershipActivationType.FORM_THEN_REVIEW;
      }
      return MembershipActivationType.FORM_REQUIRED;
    }

    if (price > 0) {
      if (requires_review) {
        return review_before_payment
          ? MembershipActivationType.REVIEW_THEN_PAYMENT
          : MembershipActivationType.PAYMENT_REQUIRED;
      }
      return MembershipActivationType.PAYMENT_REQUIRED;
    }

    if (requires_review) {
      return MembershipActivationType.REVIEW_REQUIRED;
    }

    return MembershipActivationType.AUTOMATIC;
  }

  // Helper to determine step configuration from activation type
  function getStepConfiguration(type: MembershipActivationType): {
    requires_form: boolean;
    requires_review: boolean;
    review_before_payment: boolean;
  } {
    const requires_form = [
      MembershipActivationType.FORM_REQUIRED,
      MembershipActivationType.FORM_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT,
    ].includes(type);

    const requires_review = [
      MembershipActivationType.REVIEW_REQUIRED,
      MembershipActivationType.REVIEW_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT,
    ].includes(type);

    const review_before_payment = [
      MembershipActivationType.REVIEW_THEN_PAYMENT,
      MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT,
    ].includes(type);

    return { requires_form, requires_review, review_before_payment };
  }

  // Calculate activation type
  const activationType = getActivationType({
    price: values.price,
    requires_form,
    requires_review,
    review_before_payment,
  });

  // Handle form template selection
  const onSelectFormTemplate = (templateId: string) => {
    form.setValue("form_template_id", templateId);
    setShowFormTemplateDialog(false);
  };

  // Handle roles selection
  const onSelectRoles = (roleIds: string[]) => {
    console.log('onSelectRoles called with roleIds:', roleIds);
    
    // Ensure we have valid role IDs (UUIDs)
    const validRoleIds = roleIds.filter(id => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValid = uuidRegex.test(id);
      if (!isValid) {
        console.warn('Invalid role ID found:', id);
      }
      return isValid;
    });
    
    if (validRoleIds.length !== roleIds.length) {
      console.warn('Some role IDs were invalid and filtered out.', 
        { original: roleIds, valid: validRoleIds });
    }
    
    console.log('Setting form value for roles:', validRoleIds);
    form.setValue("roles", validRoleIds, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
    
    // Also update the selectedRoles state for consistency
    setSelectedRoles(validRoleIds);
    
    // Close the dialog
    setShowRoleDialog(false);
    
    console.log('Form values after setting roles:', form.getValues());
  };

  return (
    <TierFormContext.Provider value={{
      form,
      tierType,
      tierData: initialData,
      loading,
      setLoading,
      submitting,
      setSubmitting,
      showFormTemplateDialog,
      setShowFormTemplateDialog,
      formTemplates,
      setFormTemplates,
      roles,
      setRoles,
      selectedRoles,
      setSelectedRoles,
      showRoleDialog,
      setShowRoleDialog,
      isFree,
      requires_form,
      requires_review,
      review_before_payment,
      activationType,
      onSelectFormTemplate,
      onSelectRoles,
      getActivationType,
      getStepConfiguration,
      onSuccess,
      groupId,
    }}>
      {children}
    </TierFormContext.Provider>
  );
}

// Hook to use the context
export function useTierForm() {
  const context = useContext(TierFormContext);
  if (context === undefined) {
    throw new Error("useTierForm must be used within a TierFormProvider");
  }
  return context;
} 