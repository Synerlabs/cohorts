'use server';

import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const formFieldSchema: z.ZodType<any> = z.lazy(() => 
  z.object({
    id: z.string().uuid(),
    type: z.string(),
    label: z.string().min(1, 'Label is required'),
    required: z.boolean(),
    helpText: z.string().optional(),
    // Text field config
    textConfig: z
      .object({
        minLength: z.number().optional(),
        maxLength: z.number().optional(),
        pattern: z.string().optional(),
        placeholder: z.string().optional(),
      })
      .optional(),
    // Number field config
    numberConfig: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
        step: z.number().optional(),
        placeholder: z.string().optional(),
      })
      .optional(),
    // Email field config
    emailConfig: z
      .object({
        placeholder: z.string().optional(),
        allowedDomains: z.array(z.string()).optional(),
      })
      .optional(),
    // Phone field config
    phoneConfig: z
      .object({
        format: z.string().optional(),
        placeholder: z.string().optional(),
        defaultCountry: z.string().optional(),
      })
      .optional(),
    // Date field config
    dateConfig: z
      .object({
        min: z.string().optional(),
        max: z.string().optional(),
        format: z.string().optional(),
      })
      .optional(),
    // Time field config
    timeConfig: z
      .object({
        min: z.string().optional(),
        max: z.string().optional(),
        step: z.number().optional(), // in minutes
      })
      .optional(),
    // Choice fields (radio, checkbox, select) config
    options: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          description: z.string().optional(),
        })
      )
      .optional(),
    choiceConfig: z
      .object({
        layout: z.enum(['vertical', 'horizontal']).optional(),
        allowOther: z.boolean().optional(),
        otherLabel: z.string().optional(),
      })
      .optional(),
    // File field config
    fileConfig: z
      .object({
        accept: z.string().optional(),
        maxSize: z.number().optional(),
        maxFiles: z.number().optional(),
        allowedTypes: z.array(z.string()).optional(),
      })
      .optional(),
    // Section config
    sectionConfig: z
      .object({
        description: z.string().optional(),
        fields: z.array(formFieldSchema),
        showTitle: z.boolean().optional(),
        isWizardStep: z.boolean().optional(),
      })
      .optional(),
    // Repeatable config
    repeatableConfig: z
      .object({
        minItems: z.number(),
        maxItems: z.number().optional(),
        fields: z.array(formFieldSchema),
        addLabel: z.string().optional(),
        itemLabel: z.string().optional(),
      })
      .optional(),
    // Common field value
    value: z
      .any()
      .nullable()
      .optional(),
    // Validation
    validation: z
      .object({
        required: z.boolean().optional(),
        customMessage: z.string().optional(),
        async: z.boolean().optional(),
        validate: z.string().optional(), // Custom validation function as string
      })
      .optional(),
    // Conditional display
    conditional: z
      .object({
        field: z.string().optional(),
        operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greater', 'less']).optional(),
        value: z.any().optional(),
        logic: z.enum(['and', 'or']).optional(),
        conditions: z.array(z.lazy(() => z.object({
          field: z.string().optional(),
          operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greater', 'less']).optional(),
          value: z.any().optional(),
        }))).optional(),
      })
      .optional(),
  })
);

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

export async function getPublishedFormTemplates(orgId: string) {
  try {
    const supabase = await createServiceRoleClient();
    
    const { data: templates, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('org_id', orgId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: templates };
  } catch (error) {
    console.error('Failed to fetch form templates:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch form templates',
    };
  }
} 