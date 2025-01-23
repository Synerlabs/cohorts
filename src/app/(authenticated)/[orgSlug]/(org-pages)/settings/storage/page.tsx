'use client';

import { StorageSettingsForm } from "../_components/storage-settings-form";

export default function StorageSettingsPage() {
  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Storage Settings</h1>
      <p className="text-muted-foreground">Configure where to store uploaded files like proof of payments.</p>
      <StorageSettingsForm />
    </div>
  );
} 