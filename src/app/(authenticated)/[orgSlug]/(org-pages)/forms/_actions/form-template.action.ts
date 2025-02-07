'use server';

import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const formFieldSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  label: z.string().min(1, 'Label is required'),
  required: z.boolean(),
  helpText: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  fileConfig: z
    .object({
      accept: z.string().optional(),
      maxSize: z.number().optional(),
    })
    .optional(),
  value: z
    .object({
      path: z.string(),
      url: z.string(),
      name: z.string(),
      size: z.number(),
      type: z.string(),
    })
    .nullable()
    .optional(),
});

const formTemplateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1, 'At least one field is required'),
  orgId: z.string().uuid(),
});

export type FormTemplateInput = z.infer<typeof formTemplateSchema>;

export async function createFormTemplate(data: FormTemplateInput) {
  try {
    const validated = formTemplateSchema.parse(data);
    const supabase = await createServiceRoleClient();

    const { data: template, error } = await supabase
      .from('form_templates')
      .insert({
        org_id: validated.orgId,
        title: validated.title,
        description: validated.description || null,
        schema: {
          version: 1,
          fields: validated.fields.map((field, index) => ({
            ...field,
            order: index,
          })),
        },
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;

    // Revalidate the forms list page
    revalidatePath(`/${template.org_id}/forms`);

    return { data: template };
  } catch (error) {
    console.error('Failed to create form template:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create form template',
    };
  }
}

export async function updateFormTemplate(
  id: string,
  data: Omit<FormTemplateInput, 'orgId'>
) {
  try {
    const validated = formTemplateSchema
      .omit({ orgId: true })
      .parse(data);
    const supabase = await createServiceRoleClient();

    const { data: template, error } = await supabase
      .from('form_templates')
      .update({
        title: validated.title,
        description: validated.description || null,
        schema: {
          version: 1,
          fields: validated.fields.map((field, index) => ({
            ...field,
            order: index,
          })),
        },
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate both the forms list and edit pages
    revalidatePath(`/${template.org_id}/forms`);
    revalidatePath(`/${template.org_id}/forms/${template.id}`);

    return { data: template };
  } catch (error) {
    console.error('Failed to update form template:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to update form template',
    };
  }
}

export async function deleteFormTemplate(id: string) {
  try {
    const supabase = await createServiceRoleClient();

    // First get the template to get the org_id for revalidation
    const { data: template, error: fetchError } = await supabase
      .from('form_templates')
      .select('org_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { error } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Revalidate the forms list page
    revalidatePath(`/${template.org_id}/forms`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete form template:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to delete form template',
    };
  }
}

export async function publishFormTemplate(id: string) {
  try {
    const supabase = await createServiceRoleClient();

    const { data: template, error } = await supabase
      .from('form_templates')
      .update({ status: 'published' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Revalidate both the forms list and edit pages
    revalidatePath(`/${template.org_id}/forms`);
    revalidatePath(`/${template.org_id}/forms/${template.id}`);

    return { data: template };
  } catch (error) {
    console.error('Failed to publish form template:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to publish form template',
    };
  }
} 