'use server';

import { createServiceRoleClient } from '@/lib/utils/supabase/server';
import { StorageConfig, StorageProvider } from './storage-provider.interface';
import * as googleDriveProvider from './google-drive.provider';

export async function createStorageProvider(orgId: string): Promise<StorageProvider | null> {
  const supabase = await createServiceRoleClient();
  
  console.log('Fetching storage settings for org:', orgId);
  // Get storage settings for the org
  const { data: settings, error } = await supabase
    .from('org_storage_settings')
    .select('*')
    .eq('org_id', orgId)
    .single();

  if (error) {
    console.error('Error fetching storage settings:', error);
    return null;
  }

  if (!settings) {
    console.error('No storage settings found for org:', orgId);
    return null;
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
        initialize: googleDriveProvider.initialize,
        upload: googleDriveProvider.upload,
        delete: googleDriveProvider.deleteFile
      };
    } catch (error) {
      console.error('Error initializing Google Drive provider:', error);
      return null;
    }
  }

  console.log('No supported provider found for type:', config.provider);
  return null;
} 