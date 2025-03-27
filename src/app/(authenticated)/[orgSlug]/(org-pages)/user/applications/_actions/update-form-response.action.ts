'use server';

import { FormResponseService } from "@/services/form-response.service";
import { FormResponseData } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";
import { createClient } from "@/lib/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { formResponsesUpdateSchema } from "@/lib/types/zod-schemas";
import { z } from "zod";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { cache } from "react";

export type ActionResponse = {
  success?: boolean;
  error?: string;
  message?: string;
};

const updateFormResponseSchema = z.object({
  formResponseId: z.string(),
  responseData: z.any(),
  path: z.string()
});

// Use a simple in-memory cache to prevent duplicate submissions
const submissionInProgress = new Map<string, boolean>();

/**
 * Server action to update a form response
 */
export const updateFormResponseAction = cache(async (
  _: any, 
  formData: FormData
): Promise<ActionResponse> => {
  try {
    // Get authenticated user directly from Supabase instead of using cached context
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('Form response update failed: User not authenticated');
      return { 
        success: false, 
        error: 'You must be logged in to update a form response' 
      };
    }

    // Parse and validate the form data
    const formResponseId = formData.get('formResponseId') as string;
    
    // Create a unique key for this submission
    const submissionKey = `${user.id}-${formResponseId}`;
    
    // Check if there's already a submission in progress
    if (submissionInProgress.get(submissionKey)) {
      console.log(`Submission already in progress for ${submissionKey}`);
      return {
        success: false,
        error: 'A submission is already in progress. Please wait.'
      };
    }
    
    // Mark this submission as in progress
    submissionInProgress.set(submissionKey, true);
    
    const responseDataRaw = formData.get('responseData') as string;
    const path = formData.get('path') as string;
    
    console.log('Update form response action called with:', {
      formResponseId,
      path,
      responseDataKeys: responseDataRaw ? Object.keys(JSON.parse(responseDataRaw)) : []
    });

    // Parse responseData from JSON string to object
    let responseData: FormResponseData;
    try {
      responseData = JSON.parse(responseDataRaw);
      console.log('Parsed response data successfully', {
        fieldsCount: Object.keys(responseData.fields || {}).length,
        sectionsCount: Object.keys(responseData.sections || {}).length,
        dataSize: responseDataRaw.length
      });
    } catch (error) {
      // Clear submission in progress flag
      submissionInProgress.set(submissionKey, false);
      console.error('Failed to parse responseData:', error);
      return { 
        success: false, 
        error: 'Invalid form response data' 
      };
    }

    // Validate the parameters
    try {
      updateFormResponseSchema.parse({
        formResponseId,
        responseData,
        path
      });
      console.log('Form data validation passed');
    } catch (error) {
      // Clear submission in progress flag
      submissionInProgress.set(submissionKey, false);
      if (error instanceof z.ZodError) {
        console.error('Form data validation failed:', error.errors);
        return { 
          success: false, 
          error: error.errors.map(e => e.message).join(', ') 
        };
      }
      throw error;
    }

    // Check if the user has permission to edit this form response
    const canEdit = await FormResponseService.canUserEditFormResponse(
      formResponseId,
      user.id
    );

    if (!canEdit) {
      // Clear submission in progress flag
      submissionInProgress.set(submissionKey, false);
      console.log(`Permission denied: User ${user.id} cannot edit form response ${formResponseId}`);
      return { 
        success: false, 
        error: 'You do not have permission to edit this form response' 
      };
    }

    console.log(`Starting update for form response ${formResponseId}`);
    
    // Check if there are file uploads in the response data
    const fileFields: string[] = [];
    if (responseData.fields) {
      Object.entries(responseData.fields).forEach(([key, field]: [string, any]) => {
        if (field.type === 'file' && field.value && typeof field.value === 'object') {
          fileFields.push(key);
        }
      });
    }
    
    if (responseData.sections) {
      Object.values(responseData.sections).forEach((section: any) => {
        if (section.fields) {
          Object.entries(section.fields).forEach(([key, field]: [string, any]) => {
            if (field.type === 'file' && field.value && typeof field.value === 'object') {
              fileFields.push(key);
            }
          });
        }
      });
    }
    
    console.log(`Found ${fileFields.length} file fields in form data:`, fileFields);

    try {
      // Log authentication information
      console.log(`Attempting update with authenticated user:`, {
        userId: user.id,
        email: user.email,
        aud: user.aud,
        app_metadata: user.app_metadata
      });
      
      // Check if the form response exists before trying to update
      const checkResponse = await FormResponseService.getFormResponse(formResponseId);
      if (!checkResponse) {
        console.error(`Form response ${formResponseId} does not exist`);
        submissionInProgress.set(submissionKey, false);
        return {
          success: false,
          error: 'The form response you are trying to update does not exist'
        };
      }
      
      console.log(`Form response exists and will be updated with user ${user.id}`);
      
      // Update the form response
      console.log(`Calling FormResponseService.updateFormResponse with ID: ${formResponseId} and user: ${user.id}`);
      await FormResponseService.updateFormResponse(
        formResponseId,
        responseData,
        user.id
      );
      console.log(`Form response ${formResponseId} updated successfully`);
      
      // Revalidate the application paths
      revalidatePath(path);
      console.log(`Revalidated path: ${path}`);
      
      // Clear submission in progress flag
      submissionInProgress.set(submissionKey, false);
      
      return { 
        success: true, 
        message: 'Form response updated successfully' 
      };
    } catch (error) {
      // Clear submission in progress flag
      submissionInProgress.set(submissionKey, false);
      console.error('Error in FormResponseService.updateFormResponse:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating form response:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
}); 