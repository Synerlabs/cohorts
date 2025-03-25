'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { StorageConfig, StorageProvider } from './storage-provider.interface';
import * as googleDriveProvider from './google-drive.provider';
import supabaseProvider from './supabase.provider';

export async function createStorageProvider(orgId: string): Promise<StorageProvider> {
  const supabase = await createServiceRoleClient();
  
  console.log('Fetching storage settings for org:', orgId);
  // Get storage settings for the org
  const { data: settings, error } = await supabase
    .from('org_storage_settings')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) {
    console.log('No storage settings found, using Supabase as default provider');
    return supabaseProvider;
  }

  if (!settings) {
    console.log('No storage settings found, using Supabase as default provider');
    return supabaseProvider;
  }

  console.log('Found storage settings:', {
    provider: settings.provider_type,
    hasCredentials: !!settings.credentials,
    hasSettings: !!settings.settings
  });

  const config: StorageConfig = {
    provider: settings.provider_type,
    credentials: settings.credentials,
    settings: settings.settings || {}
  };

  // Initialize the appropriate provider
  if (config.provider === 'google-drive') {
    try {
      console.log('Initializing Google Drive provider...');
      await googleDriveProvider.initialize(config);
      console.log('Google Drive provider initialized successfully');
      return {
        initialize: (conf?: StorageConfig) => googleDriveProvider.initialize(conf as StorageConfig),
        upload: googleDriveProvider.upload,
        delete: googleDriveProvider.deleteFile,
        providerType: 'google-drive',
        generatePath: (module: string, filename: string) => `${module}/${filename}`
      };
    } catch (error) {
      console.error('Error initializing Google Drive provider:', error);
      console.log('Falling back to Supabase storage provider');
      return supabaseProvider;
    }
  }

  console.log('No supported provider found, using Supabase as default provider');
  return supabaseProvider;
} 