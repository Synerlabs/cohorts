'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import * as z from 'zod';
import {
  getOrganizationForms,
  getFormById,
  createOrganizationForm,
  updateOrganizationForm,
  deleteOrganizationForm,
  submitForm,
  getFormSubmissions,
  getFormSubmission,
  reviewFormSubmission,
} from '@/services/organization-forms.service';
import { checkUserRole } from '@/utils/auth-helpers';

// Schema for creating/updating a form
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  form_schema: z.record(z.any()).optional(),
  form_ui_schema: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

// Schema for form submission
const submissionSchema = z.object({
  form_id: z.string().uuid(),
  form_data: z.record(z.any()),
});

// Schema for reviewing a form submission
const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  review_notes: z.string().optional(),
});

type FormSubmissionState = {
  errors?: {
    form_data?: string[];
  };
  message?: string;
};

type FormState = {
  errors?: {
    title?: string[];
    description?: string[];
    form_schema?: string[];
    form_ui_schema?: string[];
  };
  message?: string;
};

type ReviewState = {
  errors?: {
    status?: string[];
    review_notes?: string[];
  };
  message?: string;
};

export async function getFormsAction(organizationId: string) {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const forms = await getOrganizationForms(organizationId);
    return { forms };
  } catch (error) {
    console.error('Error fetching organization forms:', error);
    return { error: 'Failed to fetch organization forms' };
  }
}

export async function getFormAction(formId: string) {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const form = await getFormById(formId);
    if (!form) {
      return { error: 'Form not found' };
    }

    return { form };
  } catch (error) {
    console.error('Error fetching form:', error);
    return { error: 'Failed to fetch form' };
  }
}

export async function createFormAction(
  orgSlug: string,
  organizationId: string,
  formData: z.infer<typeof formSchema>,
  prevState: FormState
): Promise<FormState> {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Check if user has admin permission for the organization
    const hasPermission = await checkUserRole(user.id, organizationId, 'can_manage_forms');
    if (!hasPermission) {
      return { 
        message: 'You do not have permission to create forms for this organization', 
        errors: {} 
      };
    }

    // Validate input
    const validatedFields = formSchema.safeParse(formData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data',
      };
    }

    // Create the form
    const result = await createOrganizationForm({
      organization_id: organizationId,
      title: formData.title,
      description: formData.description,
      form_schema: formData.form_schema,
      form_ui_schema: formData.form_ui_schema,
      is_active: formData.is_active ?? true,
    });

    if (!result) {
      return { message: 'Failed to create form', errors: {} };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/forms`);
    return { message: 'Form created successfully' };
  } catch (error) {
    console.error('Error creating form:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function updateFormAction(
  orgSlug: string,
  formId: string,
  formData: z.infer<typeof formSchema>,
  prevState: FormState
): Promise<FormState> {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Get the form to check permissions
    const form = await getFormById(formId);
    if (!form) {
      return { message: 'Form not found', errors: {} };
    }

    // Check if user has admin permission for the organization
    const hasPermission = await checkUserRole(user.id, form.organization_id, 'can_manage_forms');
    if (!hasPermission) {
      return { 
        message: 'You do not have permission to update forms for this organization', 
        errors: {} 
      };
    }

    // Validate input
    const validatedFields = formSchema.safeParse(formData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid form data',
      };
    }

    // Update the form
    const result = await updateOrganizationForm(formId, {
      title: formData.title,
      description: formData.description || null,
      form_schema: formData.form_schema || {},
      form_ui_schema: formData.form_ui_schema || {},
      is_active: formData.is_active !== undefined ? formData.is_active : true,
    });

    if (!result) {
      return { message: 'Failed to update form', errors: {} };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/forms`);
    revalidatePath(`/dashboard/organizations/${orgSlug}/forms/${formId}`);
    return { message: 'Form updated successfully' };
  } catch (error) {
    console.error('Error updating form:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function deleteFormAction(orgSlug: string, formId: string) {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get the form to check permissions
    const form = await getFormById(formId);
    if (!form) {
      return { error: 'Form not found' };
    }

    // Check if user has admin permission for the organization
    const hasPermission = await checkUserRole(user.id, form.organization_id, 'can_manage_forms');
    if (!hasPermission) {
      return { error: 'You do not have permission to delete forms for this organization' };
    }

    // Delete the form
    const result = await deleteOrganizationForm(formId);
    if (!result) {
      return { error: 'Failed to delete form' };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/forms`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting form:', error);
    return { error: 'An unexpected error occurred' };
  }
}

export async function submitFormAction(
  formId: string,
  formData: Record<string, any>,
  prevState: FormSubmissionState
): Promise<FormSubmissionState> {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Validate input
    const validatedFields = submissionSchema.safeParse({
      form_id: formId,
      form_data: formData,
    });

    if (!validatedFields.success) {
      return {
        errors: {
          form_data: ['Invalid form data'],
        },
        message: 'Invalid form submission',
      };
    }

    // Submit the form
    const result = await submitForm({
      form_id: formId,
      submitter_id: user.id,
      form_data: formData,
    });

    if (!result) {
      return { message: 'Failed to submit form', errors: {} };
    }

    return { message: 'Form submitted successfully' };
  } catch (error) {
    console.error('Error submitting form:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
}

export async function getFormSubmissionsAction(formId: string) {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Get the form to check permissions
    const form = await getFormById(formId);
    if (!form) {
      return { error: 'Form not found' };
    }

    // Check if user has permission to view submissions
    const hasPermission = await checkUserRole(user.id, form.organization_id, 'can_review_form_submissions');
    if (!hasPermission) {
      return { error: 'You do not have permission to view form submissions' };
    }

    const submissions = await getFormSubmissions(formId);
    return { submissions };
  } catch (error) {
    console.error('Error fetching form submissions:', error);
    return { error: 'Failed to fetch form submissions' };
  }
}

export async function getFormSubmissionAction(submissionId: string) {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const submission = await getFormSubmission(submissionId);
    if (!submission) {
      return { error: 'Submission not found' };
    }

    // Get the form to check permissions
    const form = await getFormById(submission.form_id);
    if (!form) {
      return { error: 'Form not found' };
    }

    // Check if user is the submitter or has review permissions
    const isSubmitter = submission.submitter_id === user.id;
    const canReview = await checkUserRole(user.id, form.organization_id, 'can_review_form_submissions');

    if (!isSubmitter && !canReview) {
      return { error: 'You do not have permission to view this submission' };
    }

    return { submission };
  } catch (error) {
    console.error('Error fetching form submission:', error);
    return { error: 'Failed to fetch form submission' };
  }
}

export async function reviewFormSubmissionAction(
  orgSlug: string,
  submissionId: string,
  reviewData: z.infer<typeof reviewSchema>,
  prevState: ReviewState
): Promise<ReviewState> {
  try {
    const supabase = createClient(cookies());
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    if (!user) {
      return { message: 'Not authenticated', errors: {} };
    }

    // Get the submission
    const submission = await getFormSubmission(submissionId);
    if (!submission) {
      return { message: 'Submission not found', errors: {} };
    }

    // Get the form to check permissions
    const form = await getFormById(submission.form_id);
    if (!form) {
      return { message: 'Form not found', errors: {} };
    }

    // Check if user has permission to review submissions
    const hasPermission = await checkUserRole(user.id, form.organization_id, 'can_review_form_submissions');
    if (!hasPermission) {
      return { 
        message: 'You do not have permission to review form submissions', 
        errors: {} 
      };
    }

    // Validate input
    const validatedFields = reviewSchema.safeParse(reviewData);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Invalid review data',
      };
    }

    // Review the submission
    const result = await reviewFormSubmission(submissionId, {
      reviewer_id: user.id,
      status: reviewData.status,
      review_notes: reviewData.review_notes,
    });

    if (!result) {
      return { message: 'Failed to review submission', errors: {} };
    }

    revalidatePath(`/dashboard/organizations/${orgSlug}/forms/${form.id}/submissions`);
    revalidatePath(`/dashboard/organizations/${orgSlug}/forms/${form.id}/submissions/${submissionId}`);
    return { message: 'Submission reviewed successfully' };
  } catch (error) {
    console.error('Error reviewing form submission:', error);
    return { message: 'An unexpected error occurred', errors: {} };
  }
} 