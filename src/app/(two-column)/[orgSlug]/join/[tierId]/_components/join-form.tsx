'use client';

import { FormRenderer } from "@/components/form-renderer";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { join } from "@/app/(public)/[orgSlug]/join/_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Database } from "@/lib/types/database.types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface JoinFormProps {
  tier: IMembershipTierProduct;
  formTemplate: Database['public']['Tables']['form_templates']['Row'];
  orgId: string;
  orgSlug: string;
  userId: string;
  applicationId?: string;
  organizationId?: string;
  organizationName?: string;
  isNewOrg?: boolean;
}

export function JoinForm({ 
  tier, 
  formTemplate, 
  orgId, 
  orgSlug, 
  userId,
  applicationId,
  organizationId,
  organizationName,
  isNewOrg
}: JoinFormProps) {
  const router = useRouter();
  const [state, action, pending] = useToastActionState(
    join,
    null,
    undefined,
    {
      successTitle: "Application Submitted",
      successDescription: "Your membership application has been submitted successfully."
    }
  );

  const handleFormSubmit = async (formData: any) => {
    console.log("Submitting form with organization context");
    
    const joinFormData = new FormData();
    
    // Basic membership information
    joinFormData.set('membershipTierId', tier.id);
    joinFormData.set('groupId', orgId);
    joinFormData.set('userId', userId);
    
    // Form data from submission
    joinFormData.set('formData', JSON.stringify(formData));
    
    // Include organization context
    if (applicationId) {
      joinFormData.set('applicationId', applicationId);
    }
    
    // Include organization information
    if (isNewOrg && organizationName) {
      // For a new organization
      joinFormData.set('organizationName', organizationName);
    } else if (organizationId) {
      // For an existing organization
      joinFormData.set('organizationId', organizationId);
      if (organizationName) {
        joinFormData.set('organizationName', organizationName);
      }
    }
    
    console.log('Form submission data:', Object.fromEntries(joinFormData.entries()));
    return action(joinFormData);
  };

  // Handle redirect if provided in state
  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect);
    }
  }, [state?.redirect, router]);

  return (
    <div className="w-full max-w-lg space-y-6">
      {/* Display organization context if available */}
      {(organizationId || organizationName) && (
        <div className="mb-6 p-4 bg-muted rounded-md">
          <h3 className="text-sm font-medium">
            {isNewOrg ? "Creating Application for New Organization:" : "Creating Application for Organization:"}
          </h3>
          <p className="mt-1 text-sm">{organizationName || "Unknown organization"}</p>
          {applicationId && (
            <p className="mt-1 text-xs text-muted-foreground">Application ID: {applicationId}</p>
          )}
        </div>
      )}
      
      <FormRenderer
        formTemplateId={tier.membership_tier.form_template_id || ''}
        formTemplate={formTemplate}
        onSubmit={handleFormSubmit}
        submitButtonText="Submit Application"
      />
    </div>
  );
} 