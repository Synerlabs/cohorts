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
    type: 'section',
    label: 'Section',
    description: 'Group fields into sections or wizard steps',
  },
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
  {
    type: 'repeatable',
    label: 'Repeatable Section',
    description: 'Group of fields that can be repeated (e.g., work experience)',
  },
];

export function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [helpText, setHelpText] = useState('');
  const [required, setRequired] = useState(false);
  const [minItems, setMinItems] = useState(0);
  const [maxItems, setMaxItems] = useState(0);

  const handleAdd = () => {
    if (!selectedType || !label.trim()) return;

    const field: FormField = {
      id: crypto.randomUUID(),
      type: selectedType,
      label: label.trim(),
      required,
      helpText: helpText.trim() || undefined,
    };

    // Add type-specific configurations
    switch (selectedType) {
      case 'text':
        field.textConfig = {
          minLength: 0,
          maxLength: undefined,
          placeholder: '',
        };
        break;
      case 'textarea':
        field.textConfig = {
          minLength: 0,
          maxLength: undefined,
          placeholder: '',
        };
        break;
      case 'number':
        field.numberConfig = {
          min: undefined,
          max: undefined,
          step: 1,
          placeholder: '',
        };
        break;
      case 'email':
        field.emailConfig = {
          placeholder: 'Enter email',
          allowedDomains: [],
        };
        break;
      case 'phone':
        field.phoneConfig = {
          format: '',
          placeholder: 'Enter phone number',
          defaultCountry: 'US',
        };
        break;
      case 'date':
        field.dateConfig = {
          min: undefined,
          max: undefined,
          format: 'YYYY-MM-DD',
        };
        break;
      case 'time':
        field.timeConfig = {
          min: undefined,
          max: undefined,
          step: 15, // 15 minutes
        };
        break;
      case 'radio':
      case 'checkbox':
      case 'select':
        field.options = [];
        field.choiceConfig = {
          layout: 'vertical',
          allowOther: false,
        };
        break;
      case 'file':
        field.fileConfig = {
          accept: '*',
          maxSize: 5 * 1024 * 1024, // 5MB default
          maxFiles: 1,
          allowedTypes: [],
        };
        break;
      case 'repeatable':
        field.repeatableConfig = {
          minItems: minItems || 0,
          maxItems: maxItems || undefined,
          fields: [],
          addLabel: 'Add Item',
          itemLabel: 'Item',
        };
        break;
    }

    onAdd(field);
    resetForm();
  };

  const resetForm = () => {
    setSelectedType(null);
    setLabel('');
    setHelpText('');
    setRequired(false);
    setMinItems(0);
    setMaxItems(0);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const availableFieldTypes = FIELD_TYPES.filter(type => type.type !== 'section');

  const renderAdditionalFields = () => {
    if (selectedType === 'repeatable') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="min-items">Minimum Items</Label>
            <Input
              id="min-items"
              type="number"
              min={0}
              value={minItems}
              onChange={(e) => setMinItems(parseInt(e.target.value) || 0)}
              className="mt-1"
              placeholder="0"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Minimum number of sections required (0 for optional)
            </div>
          </div>
          <div>
            <Label htmlFor="max-items">Maximum Items</Label>
            <Input
              id="max-items"
              type="number"
              min={0}
              value={maxItems}
              onChange={(e) => setMaxItems(parseInt(e.target.value) || 0)}
              className="mt-1"
              placeholder="Leave empty for unlimited"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Maximum number of sections allowed (0 for unlimited)
            </div>
          </div>
        </div>
      );
    }
    return null;
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
              {availableFieldTypes.map((fieldType) => (
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

              {renderAdditionalFields()}

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
                <Button 
                  onClick={() => {
                    handleAdd();
                    handleOpenChange(false);
                  }} 
                  disabled={!label.trim()}
                >
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