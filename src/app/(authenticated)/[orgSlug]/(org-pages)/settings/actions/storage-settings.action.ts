"use server";

import { createClient, createServiceRoleClient } from "@/lib/utils/supabase/server";
import { StorageProviderType } from "@/services/storage/storage-settings.service";

export type StorageSettingsFormState = {
  success: boolean;
  error?: string;
  data?: {
    id: string;
    orgId: string;
    providerType: StorageProviderType;
    credentials: Record<string, any>;
    settings: Record<string, any>;
  };
};

export type UpdateStorageSettingsPayload = {
  orgId: string;
  providerType: StorageProviderType;
  credentials: Record<string, any>;
  settings: Record<string, any>;
};

async function getGroupIdFromSlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('group')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.error("Error getting group ID:", error);
    return null;
  }

  return data.id;
}

export async function updateStorageSettingsAction(
  prevState: StorageSettingsFormState,
  payload: UpdateStorageSettingsPayload
): Promise<StorageSettingsFormState> {
  try {
    const supabase = await createServiceRoleClient();
    const groupId = await getGroupIdFromSlug(payload.orgId);
    
    if (!groupId) {
      return {
        success: false,
        error: "Could not find organization",
      };
    }

    const { data: settings, error } = await supabase
      .from('org_storage_settings')
      .upsert(
        {
          org_id: groupId,
          provider_type: payload.providerType,
          credentials: payload.credentials,
          settings: payload.settings,
        },
        {
          onConflict: 'org_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error("Error updating storage settings:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      data: {
        id: settings.id,
        orgId: settings.org_id,
        providerType: settings.provider_type,
        credentials: settings.credentials,
        settings: settings.settings,
      },
    };
  } catch (error) {
    console.error("Error updating storage settings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

export async function getStorageSettingsAction(
  prevState: StorageSettingsFormState | null,
  payload: { orgId: string }
): Promise<StorageSettingsFormState> {
  try {
    const supabase = await createServiceRoleClient();
    const groupId = await getGroupIdFromSlug(payload.orgId);
    
    if (!groupId) {
      return {
        success: false,
        error: "Could not find organization",
      };
    }

    const { data: settings, error } = await supabase
      .from('org_storage_settings')
      .select('*')
      .eq('org_id', groupId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error getting storage settings:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!settings) {
      return {
        success: true,
        data: {
          id: '',
          orgId: groupId,
          providerType: 'google-drive',
          credentials: {},
          settings: {},
        },
      };
    }

    return {
      success: true,
      data: {
        id: settings.id,
        orgId: settings.org_id,
        providerType: settings.provider_type,
        credentials: settings.credentials,
        settings: settings.settings,
      },
    };
  } catch (error) {
    console.error("Error getting storage settings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
} 