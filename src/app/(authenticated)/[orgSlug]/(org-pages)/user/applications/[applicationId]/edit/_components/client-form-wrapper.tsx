'use client';

import { useState, useCallback } from 'react';
import { FormRenderer } from "@/components/form-renderer";
import { updateFormResponseAction } from "../../../_actions/update-form-response.action";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface ClientFormWrapperProps {
  formTemplateId: string;
  formTemplate: any;
  initialResponseData: any;
  formResponseId: string;
  orgSlug: string;
}

export function ClientFormWrapper({ 
  formTemplateId, 
  formTemplate, 
  initialResponseData, 
  formResponseId,
  orgSlug
}: ClientFormWrapperProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  
  // Memoize the form submission handler to prevent unnecessary re-renders
  const handleFormSubmit = useCallback(async (formData: any) => {
    // Prevent multiple submissions
    if (submitting) return { success: false };
    
    setSubmitting(true);
    console.log('Form submit handler called with data');
    
    try {
      // Create a FormData object to send to the server
      const submitData = new FormData();
      submitData.append('formResponseId', formResponseId);
      submitData.append('responseData', JSON.stringify(formData.responseData));
      submitData.append('path', `/@${orgSlug}/user/applications`);
      
      // Call the update action
      const response = await updateFormResponseAction(null, submitData);
      console.log('Form submission response:', response);
      
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Your application has been updated successfully!',
        });
        router.push(`/@${orgSlug}/user/applications`);
        return { success: true };
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update application.',
          variant: 'destructive',
        });
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred.',
        variant: 'destructive',
      });
      return { success: false, error: 'An error occurred while submitting the form.' };
    } finally {
      setSubmitting(false);
    }
  }, [formResponseId, orgSlug, router, submitting]);
  
  return (
    <FormRenderer
      formTemplateId={formTemplateId}
      formTemplate={formTemplate}
      onSubmit={handleFormSubmit}
      submitButtonText="Update Application"
      initialResponseData={initialResponseData}
    />
  );
} 