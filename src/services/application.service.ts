import { createClient } from "@/lib/utils/supabase/server";
import { FormResponse, FormTemplate } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";

export type ApplicationStatus = 'pending' | 'pending_payment' | 'approved' | 'rejected';

export interface ApplicationBase {
  form_response_id: string | null;
}

export interface Application {
  id: string;
  status: ApplicationStatus;
  submitted_at: string;
  user_data: {
    full_name: string;
    email: string;
  };
  product_name: string;
  product_price: number;
  product_currency: string;
  duration_months: number;
  activation_type: string;
  group_id: string;
}

export class ApplicationService {
  private static async getSupabaseClient() {
    return await createClient();
  }

  static async getApplicationBase(applicationId: string): Promise<ApplicationBase> {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase
      .from('applications')
      .select('form_response_id')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('Error loading application base:', error);
      throw new Error(`Failed to load application: ${error.message}`);
    }

    return data;
  }

  static async getApplicationDetails(applicationId: string): Promise<Application> {
    const supabase = await this.getSupabaseClient();
    
    const { data, error } = await supabase
      .from('membership_applications_view')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('Error loading application:', error);
      throw new Error(`Failed to load application details: ${error.message}`);
    }

    if (!data) {
      throw new Error('Application not found');
    }

    // Validate the status
    if (!['pending', 'pending_payment', 'approved', 'rejected'].includes(data.status)) {
      throw new Error(`Invalid application status: ${data.status}`);
    }

    return data as Application;
  }

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
} 