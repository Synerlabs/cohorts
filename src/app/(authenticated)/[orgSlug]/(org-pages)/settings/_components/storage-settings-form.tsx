'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageProviderType } from '@/services/storage/storage-settings.service';
import { updateStorageSettingsAction } from '../actions/storage-settings.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

const storageSettingsSchema = z.object({
  providerType: z.enum(['google-drive', 'blob-storage']),
  credentials: z.record(z.any()),
  settings: z.record(z.any()),
});

type StorageSettingsFormData = z.infer<typeof storageSettingsSchema>;

const PROVIDER_FIELDS = {
  'google-drive': {
    credentials: ['clientId', 'clientSecret', 'redirectUri'],
    settings: ['folderId'],
  },
  'blob-storage': {
    credentials: ['accountName', 'accountKey'],
    settings: ['containerName'],
  },
} as const;

type StorageSettingsFormProps = {
  orgSlug: string;
  initialData?: {
    id: string;
    orgId: string;
    providerType: StorageProviderType;
    credentials: Record<string, any>;
    settings: Record<string, any>;
  };
};

export function StorageSettingsForm({ orgSlug, initialData }: StorageSettingsFormProps) {
  const [state, updateAction] = useToastActionState(updateStorageSettingsAction, undefined, undefined, {
    successTitle: "Success",
    successDescription: "Storage settings updated successfully",
  });

  const form = useForm<StorageSettingsFormData>({
    resolver: zodResolver(storageSettingsSchema),
    defaultValues: {
      providerType: initialData?.providerType || 'google-drive',
      credentials: initialData?.credentials || {},
      settings: initialData?.settings || {},
    },
  });

  const onSubmit = async (data: StorageSettingsFormData) => {
    await updateAction({
      orgId: orgSlug,
      ...data,
    });
  };

  const providerType = form.watch('providerType') as StorageProviderType;
  const fields = PROVIDER_FIELDS[providerType];

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="google-drive">Google Drive</SelectItem>
                      <SelectItem value="blob-storage">Blob Storage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Credentials</h3>
              {fields.credentials.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={`credentials.${field}`}
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel>
                      <FormControl>
                        <Input value={value || ''} onChange={onChange} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Settings</h3>
              {fields.settings.map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={`settings.${field}`}
                  render={({ field: { value, onChange } }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{field.replace(/([A-Z])/g, ' $1')}</FormLabel>
                      <FormControl>
                        <Input value={value || ''} onChange={onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <Button type="submit">Save Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 