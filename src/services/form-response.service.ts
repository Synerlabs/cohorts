import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { FormResponse, FormTemplate, FormResponseData } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";

export class FormResponseService {
  private static async getSupabaseClient() {
    return await createClient();
  }

  /**
   * Get a form response by ID along with its template
   */
  static async getFormResponse(formResponseId: string): Promise<{ formResponse: FormResponse; formTemplate: FormTemplate } | null> {
    const supabase = await this.getSupabaseClient();
    
    const { data: formResponseData, error: formResponseError } = await supabase
      .from('form_responses')
      .select('*, form_templates(*)')
      .eq('id', formResponseId)
      .single();

    if (formResponseError) {
      console.error('Error loading form response:', formResponseError);
      throw new Error(`Failed to load form response: ${formResponseError.message}`);
    }

    if (!formResponseData) {
      return null;
    }

    try {
      // Parse the template schema
      const formTemplate: FormTemplate = {
        id: formResponseData.form_templates.id,
        title: formResponseData.form_templates.title,
        description: formResponseData.form_templates.description,
        schema: typeof formResponseData.form_templates.schema === 'string' 
          ? JSON.parse(formResponseData.form_templates.schema)
          : formResponseData.form_templates.schema
      };

      // Ensure response_data has the correct structure
      const rawResponseData = formResponseData.response_data?.responseData || {};
      
      const validatedResponseData = {
        fields: typeof rawResponseData.fields === 'object' ? rawResponseData.fields : {},
        sections: typeof rawResponseData.sections === 'object' ? rawResponseData.sections : {}
      };

      const formResponse: FormResponse = {
        id: formResponseData.id,
        template_id: formResponseData.response_data?.templateId || formResponseData.template_id,
        response_data: validatedResponseData,
        form_templates: {
          id: formResponseData.form_templates.id,
          title: formResponseData.form_templates.title,
          description: formResponseData.form_templates.description
        }
      };

      return { formResponse, formTemplate };
    } catch (error) {
      console.error('Error parsing form data:', error);
      throw new Error('Failed to parse form data. The form template may be invalid.');
    }
  }

  /**
   * Update a form response with new data
   */
  static async updateFormResponse(
    formResponseId: string,
    responseData: FormResponseData,
    userId?: string
  ): Promise<FormResponse> {
    // Use createServiceRoleClient with higher privileges
    const supabase = await createServiceRoleClient();
    
    // Double log the client type and formResponseId for debugging
    console.log(`Using service role client to update form response ${formResponseId}`);

    // Get the original response to merge with new data
    const { data: originalResponse, error: getError } = await supabase
      .from('form_responses')
      .select('*, form_templates(*)')
      .eq('id', formResponseId)
      .single();

    if (getError) {
      console.error('Error getting original form response:', getError);
      throw new Error(`Failed to get original form response: ${getError.message}`);
    }

    // Prepare the updated response data
    const updatedResponseData = {
      responseData: {
        templateId: originalResponse.template_id,
        fields: responseData.fields,
        sections: responseData.sections
      }
    };

    // Log some info for debugging
    console.log(`Updating form response ${formResponseId} with data structure:`, {
      responseDataSize: JSON.stringify(updatedResponseData).length,
      hasFields: !!responseData.fields,
      fieldCount: Object.keys(responseData.fields || {}).length,
      hasSections: !!responseData.sections,
      sectionCount: Object.keys(responseData.sections || {}).length
    });

    // Log the original response for debugging
    console.log(`Original form response:`, {
      id: originalResponse.id,
      template_id: originalResponse.template_id,
      form_template_id: originalResponse.form_templates?.id,
      submitted_by: originalResponse.submitted_by
    });

    // Prepare the update data without creating a new structure
    const updateData = {
      response_data: updatedResponseData,
      // Only update submitted_by if provided and not already set
      ...(userId && !originalResponse.submitted_by ? { submitted_by: userId } : {})
    };
    
    console.log('Using update with data:', {
      id: formResponseId,
      updateData: Object.keys(updateData),
      response_data_size: JSON.stringify(updateData.response_data).length,
      updating_submitted_by: !!(userId && !originalResponse.submitted_by)
    });

    // Use update instead of upsert to avoid RLS policy violations
    const { data, error: updateError } = await supabase
      .from('form_responses')
      .update(updateData)
      .eq('id', formResponseId)
      .select('*, form_templates(*)');

    if (updateError) {
      console.error('Error updating form response:', updateError);
      throw new Error(`Failed to update form response: ${updateError.message}`);
    }

    console.log(`Update result:`, {
      success: !!data,
      dataLength: Array.isArray(data) ? data.length : (data ? 1 : 0)
    });

    if (!data || (Array.isArray(data) && data.length === 0)) {
      // Try to get the current record to see if it exists
      const { data: checkData, error: checkError } = await supabase
        .from('form_responses')
        .select('id')
        .eq('id', formResponseId);
        
      if (checkError) {
        console.error('Error checking if form response exists:', checkError);
      } else {
        console.log(`Form response check result:`, {
          exists: !!checkData && checkData.length > 0,
          count: checkData ? checkData.length : 0
        });
      }
      
      throw new Error('No form response was updated - the record may not exist or you may not have permission to update it.');
    }

    // Get the first result if multiple were returned
    const updatedResponse = Array.isArray(data) ? data[0] : data;

    try {
      // Format the response in the expected structure
      const formTemplate: FormTemplate = {
        id: updatedResponse.form_templates.id,
        title: updatedResponse.form_templates.title,
        description: updatedResponse.form_templates.description,
        schema: typeof updatedResponse.form_templates.schema === 'string' 
          ? JSON.parse(updatedResponse.form_templates.schema)
          : updatedResponse.form_templates.schema
      };

      const rawResponseData = updatedResponse.response_data?.responseData || {};
      
      const validatedResponseData = {
        fields: typeof rawResponseData.fields === 'object' ? rawResponseData.fields : {},
        sections: typeof rawResponseData.sections === 'object' ? rawResponseData.sections : {}
      };

      const formResponse: FormResponse = {
        id: updatedResponse.id,
        template_id: updatedResponse.response_data?.templateId || updatedResponse.template_id,
        response_data: validatedResponseData,
        form_templates: {
          id: updatedResponse.form_templates.id,
          title: updatedResponse.form_templates.title,
          description: updatedResponse.form_templates.description
        }
      };

      return formResponse;
    } catch (error) {
      console.error('Error formatting updated form response:', error);
      throw new Error('Failed to format updated form response.');
    }
  }

  /**
   * Check if a user has permission to edit a form response
   * Associated with an application
   */
  static async canUserEditFormResponse(
    formResponseId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const supabase = await createServiceRoleClient();
      
      console.log(`Checking if user ${userId} can edit form response ${formResponseId} (with service role)`);
      
      // First, check if the user is the one who submitted the form
      const { data: formResponse, error: formError } = await supabase
        .from('form_responses')
        .select('submitted_by')
        .eq('id', formResponseId)
        .single();
        
      if (formError) {
        console.error('Error checking form response ownership:', formError);
        return false;
      }
      
      // If the user is the submitter, they can edit
      if (formResponse?.submitted_by === userId) {
        console.log(`User ${userId} is the submitter of form response ${formResponseId}`);
        return true;
      }
      
      // Next, check if this form is linked to an application owned by the user
      // and the application is still in "pending" status
      const { data: applications, error: appError } = await supabase
        .from('applications')
        .select('id, status, group_user_id')
        .eq('form_response_id', formResponseId)
        .is('deleted_at', null);
        
      if (appError) {
        console.error('Error checking application ownership:', appError);
        return false;
      }
      
      // Check if any of the applications are owned by this user
      if (Array.isArray(applications) && applications.length > 0) {
        console.log(`Found ${applications.length} applications for form response ${formResponseId}`);
        
        // First check if any of the applications directly match the userId
        let userOwnsAnyApplication = false;
        
        // For any application with a group_user_id, check if it belongs to the current user
        for (const app of applications) {
          if (app.status !== 'pending') {
            continue; // Skip non-pending applications
          }
          
          if (app.group_user_id) {
            // Query to check if this group_user belongs to our user
            const { data: groupUser, error: groupUserError } = await supabase
              .from('group_users')
              .select('user_id')
              .eq('id', app.group_user_id)
              .single();
              
            if (!groupUserError && groupUser && groupUser.user_id === userId) {
              console.log(`User ${userId} owns application ${app.id} via group_user ${app.group_user_id}`);
              userOwnsAnyApplication = true;
              break;
            }
          }
        }
        
        if (userOwnsAnyApplication) {
          return true;
        }
      }
      
      console.log(`User ${userId} does not have permission to edit form response ${formResponseId}`);
      return false;
    } catch (error) {
      console.error('Unexpected error in canUserEditFormResponse:', error);
      return false;
    }
  }
} 