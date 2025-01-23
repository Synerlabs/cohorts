import { createClient } from "@/lib/utils/supabase/server";
import { StorageConfig, StorageProvider } from "./storage-provider.interface";
import { GoogleDriveProvider } from "./google-drive.provider";

export type StorageProviderType = 'google-drive' | 'blob-storage';

export interface StorageSettings {
  id: string;
  orgId: string;
  providerType: StorageProviderType;
  credentials: Record<string, any>;
  settings: Record<string, any>;
}

export class StorageSettingsService {
  private static providers: Record<StorageProviderType, new () => StorageProvider> = {
    'google-drive': GoogleDriveProvider,
    'blob-storage': GoogleDriveProvider, // Temporary, remove when implementing blob storage
  };

  static async getStorageSettings(orgId: string): Promise<StorageSettings | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('org_storage_settings')
      .select('*')
      .eq('org_id', orgId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      orgId: data.org_id,
      providerType: data.provider_type,
      credentials: data.credentials,
      settings: data.settings,
    };
  }

  static async updateStorageSettings(
    orgId: string,
    settings: Partial<StorageSettings>
  ): Promise<StorageSettings | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('org_storage_settings')
      .upsert({
        org_id: orgId,
        provider_type: settings.providerType,
        credentials: settings.credentials,
        settings: settings.settings,
      })
      .select()
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      orgId: data.org_id,
      providerType: data.provider_type,
      credentials: data.credentials,
      settings: data.settings,
    };
  }

  static async createStorageProvider(orgId: string): Promise<StorageProvider | null> {
    const settings = await this.getStorageSettings(orgId);
    if (!settings) return null;

    const Provider = this.providers[settings.providerType];
    if (!Provider) return null;

    const provider = new Provider();
    const config: StorageConfig = {
      type: settings.providerType,
      credentials: settings.credentials,
      settings: settings.settings,
    };

    await provider.initialize(config);
    return provider;
  }
} 