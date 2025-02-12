'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './form-field';
import { 
  Trash2, 
  Type, 
  AlignLeft, 
  Mail, 
  Hash, 
  Phone, 
  Calendar, 
  Clock, 
  CircleDot, 
  CheckSquare, 
  ChevronsUpDown, 
  Upload, 
  Files, 
  LayoutGrid,
  Folder,
  List,
  Copy,
  Layers
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: FormField) => void;
}

export const FIELD_TYPES = [
  {
    type: 'text',
    label: 'Text',
    description: 'Single line text input',
    icon: Type,
  },
  {
    type: 'textarea',
    label: 'Text Area',
    description: 'Multi-line text input',
    icon: AlignLeft,
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input with optional validation',
    icon: Hash,
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email address input with validation',
    icon: Mail,
  },
  {
    type: 'phone',
    label: 'Phone',
    description: 'Phone number input with validation',
    icon: Phone,
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker input',
    icon: Calendar,
  },
  {
    type: 'select',
    label: 'Select',
    description: 'Dropdown selection from a list of options',
    icon: List,
  },
  {
    type: 'file',
    label: 'File Upload',
    description: 'File upload with optional type restrictions',
    icon: Upload,
  },
  {
    type: 'repeatable',
    label: 'Repeatable Section',
    description: 'Group of fields that can be repeated',
    icon: Copy,
  },
  {
    type: 'section',
    label: 'Section',
    description: 'Group of fields with a title and description',
    icon: Layers,
  },
  {
    type: 'group',
    label: 'Field Group',
    description: 'Group related fields together (e.g., name fields, address fields)',
    icon: Folder,
  },
  {
    type: 'checkbox',
    label: 'Checkbox',
    description: 'Single checkbox for boolean values',
    icon: CheckSquare,
  },
] as const;

export function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  const [selectedType, setSelectedType] = useState<(typeof FIELD_TYPES)[number]['type'] | null>(null);
  const [field, setField] = useState<FormField | null>(null);

  const handleFieldChange = (updates: Partial<FormField>) => {
    if (!field) return;
    setField({ ...field, ...updates });
  };

  const handleConfigChange = <T extends keyof FormField>(
    configKey: T,
    updates: Partial<FormField[T]>
  ) => {
    if (!field) return;
    setField({
      ...field,
      [configKey]: {
        ...(field[configKey] as any),
        ...updates,
      },
    });
  };

  const renderFieldConfig = () => {
    if (!field) return null;

    switch (field.type) {
      case 'text':
      case 'textarea':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.textConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('textConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.textConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('textConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.numberConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('numberConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.numberConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('numberConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
            <div>
              <Label>Minimum Value</Label>
              <Input
                type="number"
                value={field.numberConfig?.min || ''}
                onChange={(e) =>
                  handleConfigChange('numberConfig', { min: Number(e.target.value) })
                }
                placeholder="Enter minimum value"
              />
            </div>
            <div>
              <Label>Maximum Value</Label>
              <Input
                type="number"
                value={field.numberConfig?.max || ''}
                onChange={(e) =>
                  handleConfigChange('numberConfig', { max: Number(e.target.value) })
                }
                placeholder="Enter maximum value"
              />
            </div>
            <div>
              <Label>Step</Label>
              <Input
                type="number"
                value={field.numberConfig?.step || ''}
                onChange={(e) =>
                  handleConfigChange('numberConfig', { step: Number(e.target.value) })
                }
                placeholder="Enter step value"
              />
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.emailConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('emailConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.emailConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('emailConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.phoneConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('phoneConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.phoneConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('phoneConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
          </div>
        );

      case 'date':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.dateConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('dateConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.dateConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('dateConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
          </div>
        );

      case 'select':
        return (
          <div className="space-y-4">
            <div>
              <Label>Placeholder</Label>
              <Input
                value={field.selectConfig?.placeholder || ''}
                onChange={(e) =>
                  handleConfigChange('selectConfig', { placeholder: e.target.value })
                }
                placeholder="Enter placeholder text"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.selectConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('selectConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
            <div>
              <Label>Options</Label>
              <div className="space-y-2">
                {field.selectConfig?.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...(field.selectConfig?.options || [])];
                        newOptions[index] = {
                          ...newOptions[index],
                          label: e.target.value,
                          value: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        };
                        handleConfigChange('selectConfig', { options: newOptions });
                      }}
                      placeholder="Option label"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = [...(field.selectConfig?.options || [])];
                        newOptions.splice(index, 1);
                        handleConfigChange('selectConfig', { options: newOptions });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    const newOptions = [...(field.selectConfig?.options || [])];
                    newOptions.push({ label: '', value: '' });
                    handleConfigChange('selectConfig', { options: newOptions });
                  }}
                >
                  Add Option
                </Button>
              </div>
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-4">
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.fileConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('fileConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
            <div>
              <Label>Maximum File Size (bytes)</Label>
              <Input
                type="number"
                value={field.fileConfig?.maxSize || ''}
                onChange={(e) =>
                  handleConfigChange('fileConfig', { maxSize: Number(e.target.value) })
                }
                placeholder="Enter maximum file size"
              />
            </div>
            <div>
              <Label>Allowed File Types</Label>
              <Input
                value={field.fileConfig?.allowedTypes?.join(', ') || ''}
                onChange={(e) =>
                  handleConfigChange('fileConfig', {
                    allowedTypes: e.target.value.split(',').map((type) => type.trim()),
                  })
                }
                placeholder="Enter allowed file types (comma-separated)"
              />
            </div>
          </div>
        );

      case 'repeatable':
      case 'section':
      case 'group':
        const configKey = `${field.type}Config` as const;
        return (
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Input
                value={field[configKey]?.description || ''}
                onChange={(e) =>
                  handleConfigChange(configKey, { description: e.target.value })
                }
                placeholder="Enter description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={field[configKey]?.showTitle || false}
                onCheckedChange={(checked) =>
                  handleConfigChange(configKey, { showTitle: !!checked })
                }
              />
              <Label>Show Title</Label>
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-4">
            <div>
              <Label>Checkbox Label</Label>
              <Input
                value={field.checkboxConfig?.label || ''}
                onChange={(e) =>
                  handleConfigChange('checkboxConfig', { label: e.target.value })
                }
                placeholder="Enter checkbox label"
              />
            </div>
            <div>
              <Label>Help Text</Label>
              <Input
                value={field.checkboxConfig?.helpText || ''}
                onChange={(e) =>
                  handleConfigChange('checkboxConfig', { helpText: e.target.value })
                }
                placeholder="Enter help text"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  function createDefaultField(type: FormField['type']): FormField {
    const baseField = {
      id: crypto.randomUUID(),
      type,
      label: '',
      required: false,
    };

    switch (type) {
      case 'text':
        return {
          ...baseField,
          textConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'textarea':
        return {
          ...baseField,
          textConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'number':
        return {
          ...baseField,
          numberConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'email':
        return {
          ...baseField,
          emailConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'phone':
        return {
          ...baseField,
          phoneConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'date':
        return {
          ...baseField,
          dateConfig: {
            placeholder: '',
            helpText: '',
          },
        };
      case 'select':
        return {
          ...baseField,
          selectConfig: {
            options: [],
            placeholder: '',
            helpText: '',
          },
        };
      case 'file':
        return {
          ...baseField,
          fileConfig: {
            maxSize: 5 * 1024 * 1024, // 5MB
            allowedTypes: [],
            helpText: '',
          },
        };
      case 'repeatable':
        return {
          ...baseField,
          repeatableConfig: {
            fields: [],
            showTitle: true,
            description: '',
          },
        };
      case 'section':
        return {
          ...baseField,
          sectionConfig: {
            fields: [],
            showTitle: true,
            description: '',
          },
        };
      case 'group':
        return {
          ...baseField,
          groupConfig: {
            fields: [],
            showTitle: true,
            description: '',
          },
        };
      case 'checkbox':
        return {
          ...baseField,
          checkboxConfig: {
            label: '',
            helpText: '',
          },
        };
      case 'radio':
        return {
          ...baseField,
          options: [],
          choiceConfig: {
            layout: 'vertical',
            allowOther: false,
          },
        };
      default:
        return baseField;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Field</DialogTitle>
          <DialogDescription>
            Choose a field type and configure its properties
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!selectedType ? (
            <div className="grid grid-cols-2 gap-4">
              {FIELD_TYPES.map((fieldType) => (
                <Button
                  key={fieldType.type}
                  variant="outline"
                  className="h-auto flex-col items-start p-4 space-y-2"
                  onClick={() => {
                    setSelectedType(fieldType.type);
                    setField(createDefaultField(fieldType.type));
                  }}
                >
                  <div className="flex items-center gap-2">
                    <fieldType.icon className="h-4 w-4" />
                    <span className="font-medium">{fieldType.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground text-left">
                    {fieldType.description}
                  </p>
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Label</Label>
                <Input
                  value={field?.label || ''}
                  onChange={(e) => handleFieldChange({ label: e.target.value })}
                  placeholder="Enter field label"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field?.required || false}
                  onCheckedChange={(checked) =>
                    handleFieldChange({ required: !!checked })
                  }
                />
                <Label>Required</Label>
              </div>
              {renderFieldConfig()}
            </div>
          )}
        </div>

        <DialogFooter>
          {selectedType && (
            <Button
              variant="outline"
              onClick={() => {
                setSelectedType(null);
                setField(null);
              }}
            >
              Back
            </Button>
          )}
          <Button
            onClick={() => {
              if (field) {
                onAdd(field);
                setSelectedType(null);
                setField(null);
                onOpenChange(false);
              }
            }}
            disabled={!field || !field.label}
          >
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 