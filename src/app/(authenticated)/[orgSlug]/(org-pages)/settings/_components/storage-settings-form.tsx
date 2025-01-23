'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StorageProviderType } from '@/services/storage/storage-settings.service';
import { getStorageSettingsAction, updateStorageSettingsAction } from '../actions/storage-settings.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

const formSchema = z.object({
  providerType: z.enum(['google-drive', 'blob-storage']),
  credentials: z.record(z.any()),
  settings: z.record(z.any()),
});

type FormValues = z.infer<typeof formSchema>;

const PROVIDER_FIELDS = {
  'google-drive': {
    credentials: ['clientId', 'clientSecret', 'redirectUri'],
    settings: ['folderId'],
  },
  'blob-storage': {
    credentials: ['accountName', 'accountKey'],
    settings: ['containerName'],
  },
};

export function StorageSettingsForm() {
  const { orgSlug } = useParams();
  const [state, updateSettings] = useToastActionState(updateStorageSettingsAction, undefined, undefined, {
    successTitle: 'Settings Updated',
    successDescription: 'Storage settings have been updated successfully',
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      providerType: 'google-drive',
      credentials: {},
      settings: {},
    },
  });

  useEffect(() => {
    async function loadSettings() {
      const result = await getStorageSettingsAction(null, { orgId: orgSlug as string });
      if (result.success && result.data) {
        form.reset({
          providerType: result.data.providerType,
          credentials: result.data.credentials,
          settings: result.data.settings,
        });
      }
    }
    loadSettings();
  }, [orgSlug, form]);

  const onSubmit = async (values: FormValues) => {
    await updateSettings({ success: false }, {
      orgId: orgSlug as string,
      ...values,
    });
  };

  const providerType = form.watch('providerType') as StorageProviderType;
  const fields = PROVIDER_FIELDS[providerType];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Settings</CardTitle>
        <CardDescription>Configure where to store uploaded files</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="providerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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