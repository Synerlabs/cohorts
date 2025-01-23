"use server";

import { StorageSettings, StorageSettingsService } from "@/services/storage/storage-settings.service";
import { createClient } from "@/lib/utils/supabase/server";

export type StorageSettingsFormState = {
  success: boolean;
  error?: string;
  data?: StorageSettings;
};

export type UpdateStorageSettingsPayload = {
  orgId: string;
  providerType: "google-drive" | "blob-storage";
  credentials: Record<string, any>;
  settings: Record<string, any>;
};

export async function updateStorageSettingsAction(
  prevState: StorageSettingsFormState,
  payload: UpdateStorageSettingsPayload
): Promise<StorageSettingsFormState> {
  try {
    const result = await StorageSettingsService.updateStorageSettings(payload.orgId, {
      providerType: payload.providerType,
      credentials: payload.credentials,
      settings: payload.settings,
    });

    if (!result) {
      return {
        success: false,
        error: "Failed to update storage settings",
      };
    }

    return {
      success: true,
      data: result,
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
    const settings = await StorageSettingsService.getStorageSettings(payload.orgId);
    
    if (!settings) {
      return {
        success: false,
        error: "Storage settings not found",
      };
    }

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Error getting storage settings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
} 