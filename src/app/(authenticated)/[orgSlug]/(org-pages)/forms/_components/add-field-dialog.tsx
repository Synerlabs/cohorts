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
import { Trash2 } from 'lucide-react';

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
  const [field, setField] = useState<FormField | null>(null);

  const handleAdd = () => {
    if (!selectedType || !label.trim()) return;

    const newField: FormField = field || {
      id: crypto.randomUUID(),
      type: selectedType,
      label: label.trim(),
      required,
      helpText: helpText.trim() || undefined,
    };

    // Add type-specific configurations
    switch (selectedType) {
      case 'text':
      case 'textarea':
        newField.textConfig = {
          minLength: 0,
          maxLength: undefined,
          placeholder: '',
        };
        break;
      case 'number':
        newField.numberConfig = {
          min: undefined,
          max: undefined,
          step: 1,
          placeholder: '',
        };
        break;
      case 'email':
        newField.emailConfig = {
          placeholder: 'Enter email',
          allowedDomains: [],
        };
        break;
      case 'phone':
        newField.phoneConfig = {
          format: '',
          placeholder: 'Enter phone number',
          defaultCountry: 'US',
        };
        break;
      case 'date':
        newField.dateConfig = {
          min: undefined,
          max: undefined,
          format: 'YYYY-MM-DD',
        };
        break;
      case 'time':
        newField.timeConfig = {
          min: undefined,
          max: undefined,
          step: 15, // 15 minutes
        };
        break;
      case 'radio':
      case 'checkbox':
      case 'select':
        newField.options = [];
        newField.choiceConfig = {
          layout: 'vertical',
          allowOther: false,
        };
        break;
      case 'file':
        newField.fileConfig = {
          accept: '*',
          maxSize: 5 * 1024 * 1024, // 5MB default
          maxFiles: 1,
          allowedTypes: [],
        };
        break;
      case 'repeatable':
        newField.repeatableConfig = {
          minItems: minItems || 0,
          maxItems: maxItems || undefined,
          fields: [],
          addLabel: 'Add Item',
          itemLabel: 'Item',
        };
        break;
    }

    onAdd(newField);
    resetForm();
  };

  const resetForm = () => {
    setSelectedType(null);
    setLabel('');
    setHelpText('');
    setRequired(false);
    setMinItems(0);
    setMaxItems(0);
    setField(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const availableFieldTypes = FIELD_TYPES.filter(type => type.type !== 'section');

  const renderFieldSettings = () => {
    if (!field) return null;

    switch (selectedType) {
      case 'text':
      case 'textarea':
        return (
          <div className="space-y-4">
            <div>
              <Label>Text Settings</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="minLength">Min Length</Label>
                  <Input
                    id="minLength"
                    type="number"
                    min={0}
                    value={field.textConfig?.minLength || 0}
                    onChange={(e) => setField({
                      ...field,
                      textConfig: {
                        ...field.textConfig,
                        minLength: parseInt(e.target.value) || 0,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxLength">Max Length</Label>
                  <Input
                    id="maxLength"
                    type="number"
                    min={0}
                    value={field.textConfig?.maxLength || ''}
                    onChange={(e) => setField({
                      ...field,
                      textConfig: {
                        ...field.textConfig,
                        maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                    })}
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={field.textConfig?.placeholder || ''}
                  onChange={(e) => setField({
                    ...field,
                    textConfig: {
                      ...field.textConfig,
                      placeholder: e.target.value,
                    },
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-4">
            <div>
              <Label>Number Settings</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="min">Min Value</Label>
                  <Input
                    id="min"
                    type="number"
                    value={field.numberConfig?.min || ''}
                    onChange={(e) => setField({
                      ...field,
                      numberConfig: {
                        ...field.numberConfig,
                        min: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="max">Max Value</Label>
                  <Input
                    id="max"
                    type="number"
                    value={field.numberConfig?.max || ''}
                    onChange={(e) => setField({
                      ...field,
                      numberConfig: {
                        ...field.numberConfig,
                        max: e.target.value ? parseInt(e.target.value) : undefined,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="step">Step</Label>
                  <Input
                    id="step"
                    type="number"
                    min={0}
                    step={0.1}
                    value={field.numberConfig?.step || 1}
                    onChange={(e) => setField({
                      ...field,
                      numberConfig: {
                        ...field.numberConfig,
                        step: parseFloat(e.target.value) || 1,
                      },
                    })}
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={field.numberConfig?.placeholder || ''}
                  onChange={(e) => setField({
                    ...field,
                    numberConfig: {
                      ...field.numberConfig,
                      placeholder: e.target.value,
                    },
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label>Email Settings</Label>
              <div className="mt-2">
                <Label htmlFor="placeholder">Placeholder</Label>
                <Input
                  id="placeholder"
                  value={field.emailConfig?.placeholder || ''}
                  onChange={(e) => setField({
                    ...field,
                    emailConfig: {
                      ...field.emailConfig,
                      placeholder: e.target.value,
                    },
                  })}
                />
              </div>
              <div className="mt-2">
                <Label>Allowed Domains (Optional)</Label>
                <Textarea
                  value={field.emailConfig?.allowedDomains?.join('\n') || ''}
                  onChange={(e) => setField({
                    ...field,
                    emailConfig: {
                      ...field.emailConfig,
                      allowedDomains: e.target.value ? e.target.value.split('\n').map(d => d.trim()) : [],
                    },
                  })}
                  placeholder="Enter one domain per line"
                />
              </div>
            </div>
          </div>
        );

      case 'radio':
      case 'checkbox':
      case 'select':
        return (
          <div className="space-y-4">
            <div>
              <Label>Choice Settings</Label>
              <div className="mt-2">
                <Label>Options</Label>
                <div className="space-y-2">
                  {field.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...(field.options || [])];
                          newOptions[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase() };
                          setField({
                            ...field,
                            options: newOptions,
                          });
                        }}
                        placeholder="Option label"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newOptions = field.options?.filter((_, i) => i !== index);
                          setField({
                            ...field,
                            options: newOptions,
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newOptions = [...(field.options || [])];
                      newOptions.push({ label: '', value: '' });
                      setField({
                        ...field,
                        options: newOptions,
                      });
                    }}
                  >
                    Add Option
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Switch
                  id="allowOther"
                  checked={field.choiceConfig?.allowOther || false}
                  onCheckedChange={(checked) => setField({
                    ...field,
                    choiceConfig: {
                      ...field.choiceConfig,
                      allowOther: checked,
                    },
                  })}
                />
                <Label htmlFor="allowOther">Allow "Other" option</Label>
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-4">
            <div>
              <Label>File Upload Settings</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Label htmlFor="maxSize">Max Size (MB)</Label>
                  <Input
                    id="maxSize"
                    type="number"
                    min={0}
                    value={(field.fileConfig?.maxSize || 0) / (1024 * 1024)}
                    onChange={(e) => setField({
                      ...field,
                      fileConfig: {
                        ...field.fileConfig,
                        maxSize: parseInt(e.target.value) * 1024 * 1024,
                      },
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="maxFiles">Max Files</Label>
                  <Input
                    id="maxFiles"
                    type="number"
                    min={1}
                    value={field.fileConfig?.maxFiles || 1}
                    onChange={(e) => setField({
                      ...field,
                      fileConfig: {
                        ...field.fileConfig,
                        maxFiles: parseInt(e.target.value) || 1,
                      },
                    })}
                  />
                </div>
              </div>
              <div className="mt-2">
                <Label>Allowed File Types</Label>
                <Input
                  value={field.fileConfig?.accept || ''}
                  onChange={(e) => setField({
                    ...field,
                    fileConfig: {
                      ...field.fileConfig,
                      accept: e.target.value,
                    },
                  })}
                  placeholder=".pdf,.doc,.docx"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Enter file extensions separated by commas (e.g., .pdf,.doc,.docx)
                </div>
              </div>
            </div>
          </div>
        );

      case 'repeatable':
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

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
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
                  onClick={() => {
                    setSelectedType(fieldType.type);
                    setField({
                      id: crypto.randomUUID(),
                      type: fieldType.type,
                      label: '',
                      required: false,
                    });
                  }}
                >
                  <span className="font-semibold">{fieldType.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {fieldType.description}
                  </span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="label">Field Label</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      if (field) {
                        setField({ ...field, label: e.target.value });
                      }
                    }}
                    className="mt-1"
                    placeholder="Enter field label"
                  />
                </div>

                <div>
                  <Label htmlFor="help-text">Help Text (Optional)</Label>
                  <Textarea
                    id="help-text"
                    value={helpText}
                    onChange={(e) => {
                      setHelpText(e.target.value);
                      if (field) {
                        setField({ ...field, helpText: e.target.value });
                      }
                    }}
                    className="mt-1"
                    placeholder="Enter help text"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="required"
                    checked={required}
                    onCheckedChange={(checked) => {
                      setRequired(checked);
                      if (field) {
                        setField({ ...field, required: checked });
                      }
                    }}
                  />
                  <Label htmlFor="required">Required field</Label>
                </div>
              </div>

              {renderFieldSettings()}

              <div className="flex justify-end gap-2 pt-4 border-t">
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