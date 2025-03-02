import { createClient, createServiceRoleClient } from '@/lib/utils/supabase/server';
import { Database } from '@/lib/types/database.types';

export type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

export class FormTemplateService {
  static async getFormTemplates(orgId: string, includeDeleted = false): Promise<FormTemplate[]> {
    const supabase = await createServiceRoleClient();
    
    const query = supabase
      .from('form_templates')
      .select('id, title, description, created_at, updated_at, is_deleted, status')
      .eq('org_id', orgId);

    // Only include non-deleted items unless explicitly requested
    if (!includeDeleted) {
      query.neq('is_deleted', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching form templates:", error);
      throw error;
    }
    console.log("data", orgId, data)

    return data || [];
  }

  static async getFormTemplateById(id: string): Promise<FormTemplate | null> {
    const supabase = await createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async getPublishedFormTemplates(orgId: string): Promise<FormTemplate[]> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'published')
      .neq('is_deleted', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }
} 