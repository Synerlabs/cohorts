'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './form-field';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: FormField) => void;
}

const FIELD_TYPES = [
  {
    type: 'text',
    label: 'Short Text',
    description: 'Single line text input for short responses',
  },
  {
    type: 'textarea',
    label: 'Long Text',
    description: 'Multi-line text input for longer responses',
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Input field with email validation',
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Input field for numeric values',
  },
  {
    type: 'phone',
    label: 'Phone',
    description: 'Input field for phone numbers',
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker field',
  },
  {
    type: 'time',
    label: 'Time',
    description: 'Time picker field',
  },
  {
    type: 'radio',
    label: 'Single Select',
    description: 'Radio buttons for selecting one option',
  },
  {
    type: 'checkbox',
    label: 'Multiple Select',
    description: 'Checkboxes for selecting multiple options',
  },
  {
    type: 'select',
    label: 'Dropdown',
    description: 'Dropdown menu for selecting one option',
  },
  {
    type: 'file',
    label: 'File Upload',
    description: 'Allow users to upload files',
  },
];

export function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [helpText, setHelpText] = useState('');
  const [required, setRequired] = useState(false);

  const handleAdd = () => {
    if (!selectedType || !label.trim()) return;

    const field: FormField = {
      id: crypto.randomUUID(),
      type: selectedType,
      label: label.trim(),
      required,
      helpText: helpText.trim() || undefined,
      fileConfig:
        selectedType === 'file'
          ? {
              accept: '*',
              maxSize: 5 * 1024 * 1024, // 5MB default
            }
          : undefined,
    };

    onAdd(field);
    resetForm();
  };

  const resetForm = () => {
    setSelectedType(null);
    setLabel('');
    setHelpText('');
    setRequired(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Form Field</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!selectedType ? (
            <div className="grid grid-cols-2 gap-4">
              {FIELD_TYPES.map((fieldType) => (
                <Button
                  key={fieldType.type}
                  variant="outline"
                  className="flex flex-col items-start gap-1.5 h-auto p-4"
                  onClick={() => setSelectedType(fieldType.type)}
                >
                  <span className="font-semibold">{fieldType.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {fieldType.description}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="label">Field Label</Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="mt-1"
                  placeholder="Enter field label"
                />
              </div>

              <div>
                <Label htmlFor="help-text">Help Text (Optional)</Label>
                <Textarea
                  id="help-text"
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  className="mt-1"
                  placeholder="Enter help text"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="required"
                  checked={required}
                  onCheckedChange={setRequired}
                />
                <Label htmlFor="required">Required field</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedType(null)}
                >
                  Back
                </Button>
                <Button onClick={handleAdd} disabled={!label.trim()}>
                  Add Field
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 