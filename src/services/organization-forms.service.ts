import { createClient } from "@/lib/utils/supabase/server";
import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import camelcaseKeys from "camelcase-keys";
import { OrganizationForm, FormSubmission } from "@/types/database.types";

/**
 * Get all forms for an organization
 * @param organizationId The organization ID
 * @returns A list of organization forms
 */
export async function getOrganizationForms(organizationId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .select(`
      id,
      organization_id,
      title,
      description,
      is_active,
      created_at,
      updated_at
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error(`Error fetching forms for organization ${organizationId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get a form by ID
 * @param formId The form ID
 * @returns The organization form
 */
export async function getFormById(formId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .select(`
      id,
      organization_id,
      title,
      description,
      form_schema,
      form_ui_schema,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", formId)
    .single();
  
  if (error) {
    console.error(`Error fetching form ${formId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Create a new organization form
 * @param form The form to create
 * @returns The created form
 */
export async function createOrganizationForm(form: {
  organization_id: string;
  title: string;
  description?: string;
  form_schema?: Record<string, any>;
  form_ui_schema?: Record<string, any>;
  is_active?: boolean;
}) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .insert({
      ...form,
      form_schema: form.form_schema || { type: "object", properties: {} },
      form_ui_schema: form.form_ui_schema || {},
      is_active: form.is_active !== undefined ? form.is_active : true
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error creating organization form:", error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Update an organization form
 * @param formId The form ID
 * @param updates The updates to apply
 * @returns The updated form
 */
export async function updateOrganizationForm(
  formId: string, 
  updates: Partial<{
    title: string;
    description: string | null;
    form_schema: Record<string, any>;
    form_ui_schema: Record<string, any>;
    is_active: boolean;
  }>
) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("organization_forms")
    .update(updates)
    .eq("id", formId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error updating form ${formId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Delete an organization form
 * @param formId The form ID
 * @returns Success status
 */
export async function deleteOrganizationForm(formId: string) {
  const supabase = await createServiceRoleClient();
  
  // Check if the form is used in any requirements
  const { data: requirements, error: requirementsError } = await supabase
    .from("organization_requirements")
    .select("id")
    .eq("required_form_id", formId);
  
  if (!requirementsError && requirements.length > 0) {
    return { error: "Cannot delete this form as it is used in one or more requirements" };
  }
  
  const { error } = await supabase
    .from("organization_forms")
    .delete()
    .eq("id", formId);
  
  if (error) {
    console.error(`Error deleting form ${formId}:`, error);
    return { error: error.message };
  }
  
  return { success: true };
}

/**
 * Submit a form
 * @param submission The form submission
 * @returns The created submission
 */
export async function submitForm(submission: {
  form_id: string;
  submitter_id: string;
  form_data: Record<string, any>;
}) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .insert({
      form_id: submission.form_id,
      submitter_id: submission.submitter_id,
      form_data: submission.form_data,
      status: "SUBMITTED",
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    console.error("Error submitting form:", error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get form submissions
 * @param formId The form ID
 * @returns List of form submissions
 */
export async function getFormSubmissions(formId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .select(`
      id,
      form_id,
      submitter_id,
      reviewer_id,
      status,
      review_notes,
      submitted_at,
      reviewed_at,
      created_at,
      updated_at,
      submitter:submitter_id(id, email, first_name, last_name),
      reviewer:reviewer_id(id, email, first_name, last_name)
    `)
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });
  
  if (error) {
    console.error(`Error fetching submissions for form ${formId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Get a specific form submission
 * @param submissionId The submission ID
 * @returns The form submission
 */
export async function getFormSubmission(submissionId: string) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .select(`
      id,
      form_id,
      submitter_id,
      reviewer_id,
      form_data,
      status,
      review_notes,
      submitted_at,
      reviewed_at,
      created_at,
      updated_at,
      submitter:submitter_id(id, email, first_name, last_name),
      reviewer:reviewer_id(id, email, first_name, last_name),
      form:form_id(id, title, form_schema, form_ui_schema)
    `)
    .eq("id", submissionId)
    .single();
  
  if (error) {
    console.error(`Error fetching submission ${submissionId}:`, error);
    return { error: error.message };
  }
  
  return { data };
}

/**
 * Review a form submission
 * @param submissionId The submission ID
 * @param review The review details
 * @returns The updated submission
 */
export async function reviewFormSubmission(
  submissionId: string,
  review: {
    reviewer_id: string;
    status: "APPROVED" | "REJECTED";
    review_notes?: string;
  }
) {
  const supabase = await createServiceRoleClient();
  
  const { data, error } = await supabase
    .from("form_submissions")
    .update({
      reviewer_id: review.reviewer_id,
      status: review.status,
      review_notes: review.review_notes || null,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", submissionId)
    .select()
    .single();
  
  if (error) {
    console.error(`Error reviewing submission ${submissionId}:`, error);
    return { error: error.message };
  }
  
  return { data };
} 