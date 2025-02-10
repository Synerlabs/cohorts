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
}

export function JoinForm({ tier, formTemplate, orgId, orgSlug, userId }: JoinFormProps) {
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
    console.log("LET'S GO");
    const joinFormData = new FormData();
    joinFormData.set('membershipTierId', tier.id);
    joinFormData.set('groupId', orgId);
    joinFormData.set('userId', userId);
    console.log(formData);
    joinFormData.set('formData', JSON.stringify(formData));
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {tier.name} Application
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {tier.description}
        </p>
      </div>

      <FormRenderer
        formTemplateId={tier.membership_tier.form_template_id || ''}
        formTemplate={formTemplate}
        onSubmit={handleFormSubmit}
        submitButtonText="Submit Application"
      />
    </div>
  );
} 