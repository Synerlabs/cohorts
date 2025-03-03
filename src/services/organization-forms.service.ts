import { createClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationForm, FormSubmission } from "@/types/database.types";

/**
 * Get all forms for an organization
 */
export async function getOrganizationForms(organizationId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .select()
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationForm[] };
  }
}

/**
 * Get a specific form by ID
 */
export async function getOrganizationForm(formId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .select()
    .eq("id", formId)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationForm };
  }
}

/**
 * Create a new organization form
 */
export async function createOrganizationForm(form: {
  organizationId: number;
  title: string;
  description?: string;
  formSchema: Record<string, any>;
  formUiSchema?: Record<string, any>;
  isActive: boolean;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .insert({
      organization_id: form.organizationId,
      title: form.title,
      description: form.description,
      form_schema: form.formSchema,
      form_ui_schema: form.formUiSchema || {},
      is_active: form.isActive
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationForm };
  }
}

/**
 * Update an organization form
 */
export async function updateOrganizationForm(
  formId: number,
  updates: {
    title?: string;
    description?: string;
    formSchema?: Record<string, any>;
    formUiSchema?: Record<string, any>;
    isActive?: boolean;
  }
) {
  const supabase = await createClient();
  
  const updateData: any = {};
  if (updates.title) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.formSchema) updateData.form_schema = updates.formSchema;
  if (updates.formUiSchema) updateData.form_ui_schema = updates.formUiSchema;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  
  const { data, error } = await supabase
    .from("organization_forms")
    .update(updateData)
    .eq("id", formId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as OrganizationForm };
  }
}

/**
 * Delete an organization form
 * Note: This will fail if there are any submissions to this form
 */
export async function deleteOrganizationForm(formId: number) {
  const supabase = await createClient();
  
  // Check if there are any submissions
  const { count } = await supabase
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("form_id", formId);
    
  if (count && count > 0) {
    return { error: "Cannot delete a form that has submissions. Deactivate it instead." };
  }
  
  const { error } = await supabase
    .from("organization_forms")
    .delete()
    .eq("id", formId);

  if (error) {
    return { error: error.message };
  } else {
    return { success: true };
  }
}

/**
 * Get form submissions for a specific form
 */
export async function getFormSubmissions(formId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .select(`
      *,
      submitter:submitter_id(id, name, email, avatar_url),
      reviewer:reviewer_id(id, name, email, avatar_url)
    `)
    .eq("form_id", formId)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data, { deep: true }) as any[] };
  }
}

/**
 * Get a specific form submission
 */
export async function getFormSubmission(submissionId: number) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .select(`
      *,
      submitter:submitter_id(id, name, email, avatar_url),
      reviewer:reviewer_id(id, name, email, avatar_url),
      form:form_id(id, title, description, organization_id)
    `)
    .eq("id", submissionId)
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data, { deep: true }) as any };
  }
}

/**
 * Create a new form submission
 */
export async function createFormSubmission(submission: {
  formId: number;
  submitterId: string;
  formData: Record<string, any>;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .insert({
      form_id: submission.formId,
      submitter_id: submission.submitterId,
      form_data: submission.formData,
      status: "PENDING"
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as FormSubmission };
  }
}

/**
 * Update a form submission (for administrators to review)
 */
export async function reviewFormSubmission(
  submissionId: number,
  review: {
    reviewerId: string;
    status: "APPROVED" | "REJECTED";
    reviewNotes?: string;
  }
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .update({
      reviewer_id: review.reviewerId,
      status: review.status,
      review_notes: review.reviewNotes,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", submissionId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  } else {
    return { data: camelcaseKeys(data) as FormSubmission };
  }
} 