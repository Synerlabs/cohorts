"use client";

import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TierFormProvider, TierFormProviderProps, useTierForm } from "./TierFormContext";
import { createOrganizationTier } from "../../../affiliations/_actions/organization-affiliation.action";
import { createTier } from "../../_actions/membership.action";
import { toast } from "@/components/ui/use-toast";

// Main TierForm component that serves as the parent
export interface TierFormProps extends Omit<TierFormProviderProps, 'children'> {
  children: React.ReactNode;
}

export function TierForm({ 
  children,
  tierType, 
  groupId, 
  initialData, 
  onSuccess 
}: TierFormProps) {
  return (
    <TierFormProvider
      tierType={tierType}
      groupId={groupId}
      initialData={initialData}
      onSuccess={onSuccess}
    >
      <TierFormContent onSuccess={onSuccess}>
        {children}
      </TierFormContent>
    </TierFormProvider>
  );
}

// Inner component that receives the context
function TierFormContent({ 
  children, 
  onSuccess 
}: { 
  children: React.ReactNode;
  onSuccess?: () => void;
}) {
  const {
    form,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    showFormTemplateDialog,
    setShowFormTemplateDialog, 
    showRoleDialog,
    setShowRoleDialog,
    isFree,
    tierType,
    activationType,
    tierData,
    groupId
  } = useTierForm();
  
  // Form submission handler
  const onSubmit = async (data: any) => {
    setSubmitting(true);
    
    // Validate form template selection if requires_form is true
    if (tierType === 'membership' && data.requires_form && !data.form_template_id) {
      form.setError("form_template_id", {
        type: "manual",
        message: "Please select a form template"
      });
      setSubmitting(false);
      return;
    }
    
    try {
      const formData = new FormData();
      
      // Add common fields
      formData.append("name", data.name);
      formData.append("description", data.description || "");
      formData.append("price", String(Math.round(data.price * 100)));
      formData.append("currency", data.currency);
      formData.append("duration_months", String(data.duration_months));
      formData.append("activation_type", activationType);
      
      // Always include form_template_id in the submission, even if null
      // This ensures the backend knows whether to clear or set the form template
      if (data.requires_form && data.form_template_id) {
        formData.append("form_template_id", data.form_template_id);
      } else {
        formData.append("form_template_id", "null"); // Pass 'null' as a string to be parsed on server
      }
      
      console.log("Submitting with form_template_id:", data.requires_form ? data.form_template_id || "null" : "null");
      
      // Call the appropriate create function based on tier type
      if (tierType === 'membership') {
        // Add membership specific fields
        formData.append("group_id", groupId);
        formData.append("member_id_format", data.member_id_format || "");
        
        // Log the form data for debugging
        console.log("Submitting membership tier with form data:", {
          groupId,
          name: data.name,
          price: data.price,
          activation_type: activationType,
          form_template_id: data.form_template_id,
          roles: data.roles
        });
        
        // Add roles if any are selected
        if (data.roles && data.roles.length > 0) {
          formData.append("roles", JSON.stringify(data.roles));
        } else {
          formData.append("roles", JSON.stringify([]));
        }
        
        // Call the createTier action
        const result = await createTier(null, formData);
        
        // Log the result for debugging
        console.log("Create tier result:", result);
        
        if (result.success) {
          toast({
            title: "Success",
            description: "Membership tier created successfully",
          });
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to create membership tier",
            variant: "destructive",
          });
        }
      } else {
        // Organization tier
        formData.append("host_group_id", data.group_id || "");
        formData.append("relationship_type", data.relationship_type);
        
        // Call the organization tier creation action
        const result = await createOrganizationTier(formData);
        
        if (result.status === 'success') {
          toast({
            title: "Success",
            description: "Organization tier created successfully",
          });
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to create organization tier",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {children}
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create Tier"}
          </Button>
        </div>
      </form>
    </Form>
  );
} 