import { createClient } from '@/lib/utils/supabase/server';
import { Database } from '@/lib/types/database.types';

export type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

export class FormTemplateService {
  static async getFormTemplates(orgId: string, includeDeleted = false): Promise<FormTemplate[]> {
    const supabase = await createClient();
    
    const query = supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId);

    // Only include non-deleted items unless explicitly requested
    if (!includeDeleted) {
      query.or(`is_deleted.is.null, is_deleted.eq.false`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    console.log("query", query.explain())
    if (error) {
      throw error;
    }

    return data || [];
  }

  static async getFormTemplateById(id: string): Promise<FormTemplate | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .is('is_deleted', null)
      .or('is_deleted.eq.false')
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
      .is('is_deleted', null)
      .or('is_deleted.eq.false')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }
} 