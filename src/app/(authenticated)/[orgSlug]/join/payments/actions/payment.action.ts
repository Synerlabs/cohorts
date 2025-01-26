'use server';

import { createServiceRoleClient } from "@/lib/utils/supabase/server";
import { createStorageProvider } from "@/services/storage/storage-settings.service";
import { revalidatePath } from "next/cache";

export async function deletePaymentAction(
  _: { success: boolean },
  { paymentId, orgId, deleteFiles }: { paymentId: string; orgId: string; deleteFiles?: boolean }
): Promise<{ success: boolean }> {
  const supabase = await createServiceRoleClient();
  
  // Delete associated files if requested
  if (deleteFiles) {
    const provider = await createStorageProvider(orgId);
    if (!provider) {
      throw new Error('Storage provider not configured');
    }

    // Get payment details to find associated files
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select('uploads')
      .eq('id', paymentId)
      .eq('org_id', orgId)
      .single();

    if (fetchError) {
      throw new Error('Failed to fetch payment');
    }

    // Delete associated files from storage
    if (payment.uploads && payment.uploads.length > 0) {
      for (const upload of payment.uploads) {
        await provider.delete(upload.path);
      }
    }
  }

  // Delete payment record
  const { error: deleteError } = await supabase
    .from('payments')
    .delete()
    .eq('id', paymentId)
    .eq('org_id', orgId);

  if (deleteError) {
    throw new Error('Failed to delete payment');
  }

  revalidatePath('/[orgSlug]/join/payments');
  return { success: true };
} 