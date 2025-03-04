"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { OrganizationAffiliationServiceStatic } from "@/services/organization-affiliation.service";
import { MembershipActivationType } from "@/lib/types/membership";

// Organization tier form schema - wrapped in an async function to comply with 'use server' rules
export async function getOrganizationTierFormSchema() {
  return z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be a positive number"),
    duration_months: z.coerce.number().min(1, "Duration must be at least 1 month"),
    relationship_type: z.string().min(1, "Relationship type is required"),
    activation_type: z.string().min(1, "Activation type is required"),
    host_group_id: z.string().min(1, "Host group ID is required"),
  });
}

// Organization tier enrollment schema - wrapped in an async function to comply with 'use server' rules
export async function getOrganizationTierEnrollmentSchema() {
  return z.object({
    message: z.string().optional(),
  });
}

/**
 * Create a new organization tier
 */
export async function createOrganizationTier(formData: FormData) {
  const schema = await getOrganizationTierFormSchema();
  
  // Parse and validate form data
  const validatedFields = schema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    duration_months: formData.get("duration_months"),
    relationship_type: formData.get("relationship_type"),
    activation_type: formData.get("activation_type"),
    host_group_id: formData.get("host_group_id"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data. Please check the fields and try again.",
      status: "error",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { 
    name, 
    description, 
    price, 
    duration_months, 
    relationship_type, 
    activation_type,
    host_group_id
  } = validatedFields.data;
  
  try {
    // Create organization tier
    const tier = await OrganizationAffiliationServiceStatic.createTier({
      name,
      description: description || "",
      price: Number(price),
      currency: "USD", // Default to USD
      duration_months: Number(duration_months),
      host_group_id,
      relationship_type,
      activation_type: activation_type as MembershipActivationType,
      form_template_id: undefined,
      hierarchy_constraints: null,
    });
    
    if (!tier) {
      return {
        message: "Failed to create organization tier",
        status: "error",
        errors: {},
      };
    }
    
    // Revalidate paths
    revalidatePath(`/affiliations`);
    
    return {
      message: "Organization tier created successfully",
      status: "success",
      errors: {},
    };
  } catch (error) {
    console.error("Failed to create organization tier:", error);
    return {
      message: "Failed to create organization tier. Please try again.",
      status: "error",
      errors: {},
    };
  }
}

/**
 * Apply for an organization tier
 */
export async function applyForOrganizationTier(
  { affiliateGroupId, tierId }: { affiliateGroupId: string; tierId: string },
  prevState: any,
  formData: FormData
) {
  const schema = await getOrganizationTierEnrollmentSchema();
  
  // Parse and validate form data
  const validatedFields = schema.safeParse({
    message: formData.get("message"),
  });

  if (!validatedFields.success) {
    return {
      message: "Invalid form data. Please check the fields and try again.",
      status: "error",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { message } = validatedFields.data;
  
  try {
    // We would typically get tier by ID here
    // For now, we'll assume we have the tier details
    
    // Create application using the group ID and product ID
    const application = await OrganizationAffiliationServiceStatic.createApplication({
      groupId: affiliateGroupId,
      hostGroupId: "hostGroupId", // Would come from the tier
      productId: "productId", // Would come from the tier
      formSubmissionId: undefined,
    });
    
    if (!application) {
      return {
        message: "Failed to submit application",
        status: "error",
        errors: {},
      };
    }
    
    return {
      message: "Application submitted successfully",
      status: "success",
      errors: {},
    };
  } catch (error) {
    console.error("Failed to apply for organization tier:", error);
    return {
      message: "Failed to submit application. Please try again.",
      status: "error",
      errors: {},
    };
  }
} 