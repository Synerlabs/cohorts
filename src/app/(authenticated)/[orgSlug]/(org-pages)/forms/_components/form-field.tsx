'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, Plus, Minus } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { FileUploadResult } from '@/services/file-upload.service';

export interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  helpText?: string;
  options?: { label: string; value: string }[];
  fileConfig?: {
    accept?: string;
    maxSize?: number;
  };
  value?: FileUploadResult | null;
  repeatableConfig?: {
    minItems: number;
    maxItems?: number;
    fields: FormField[];
  };
}

interface FormFieldProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
}

export function FormField({ field, onUpdate, onDelete }: FormFieldProps) {
  const { toast } = useToast();

  const handleLabelChange = (value: string) => {
    onUpdate({ ...field, label: value });
  };

  const handleHelpTextChange = (value: string) => {
    onUpdate({ ...field, helpText: value });
  };

  const handleRequiredChange = (checked: boolean) => {
    onUpdate({ ...field, required: checked });
  };

  const handleFileUpload = (file: FileUploadResult) => {
    onUpdate({ ...field, value: file });
  };

  const handleFileRemove = () => {
    onUpdate({ ...field, value: null });
  };

  const handleFileError = (error: string) => {
    toast({
      title: 'Error',
      description: error,
      variant: 'destructive',
    });
  };

  const handleAddSubfield = () => {
    if (!field.repeatableConfig) return;

    const newField: FormField = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'New Field',
      required: false,
    };

    onUpdate({
      ...field,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: [...field.repeatableConfig.fields, newField],
      },
    });
  };

  const handleUpdateSubfield = (index: number, updatedField: FormField) => {
    if (!field.repeatableConfig) return;

    const newFields = [...field.repeatableConfig.fields];
    newFields[index] = updatedField;

    onUpdate({
      ...field,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: newFields,
      },
    });
  };

  const handleDeleteSubfield = (index: number) => {
    if (!field.repeatableConfig) return;

    onUpdate({
      ...field,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: field.repeatableConfig.fields.filter((_, i) => i !== index),
      },
    });
  };

  const renderFieldConfig = () => {
    if (field.type === 'file') {
      return (
        <div className="space-y-4">
          <div>
            <Label>Accepted File Types</Label>
            <Input
              value={field.fileConfig?.accept || '*'}
              onChange={(e) =>
                onUpdate({
                  ...field,
                  fileConfig: {
                    ...field.fileConfig,
                    accept: e.target.value,
                  },
                })
              }
              placeholder="e.g., .pdf,.doc,.docx"
              className="mt-1"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Enter file extensions or MIME types, separated by commas
            </div>
          </div>
          <div>
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={
                field.fileConfig?.maxSize
                  ? Math.round(field.fileConfig.maxSize / 1024 / 1024)
                  : 5
              }
              onChange={(e) =>
                onUpdate({
                  ...field,
                  fileConfig: {
                    ...field.fileConfig,
                    maxSize: parseInt(e.target.value) * 1024 * 1024,
                  },
                })
              }
              min={1}
              max={100}
              className="mt-1"
            />
          </div>
        </div>
      );
    }

    if (field.type === 'repeatable') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Subfields</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSubfield}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
          <div className="pl-4 border-l-2 space-y-4">
            {field.repeatableConfig?.fields.map((subfield, index) => (
              <FormField
                key={subfield.id}
                field={subfield}
                onUpdate={(updatedField) => handleUpdateSubfield(index, updatedField)}
                onDelete={() => handleDeleteSubfield(index)}
              />
            ))}
            {field.repeatableConfig?.fields.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No fields added yet. Click &quot;Add Field&quot; to add a field to this section.
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label>Min Items</Label>
              <div className="text-sm text-muted-foreground">
                {field.repeatableConfig?.minItems || 0}
              </div>
            </div>
            <div>
              <Label>Max Items</Label>
              <div className="text-sm text-muted-foreground">
                {field.repeatableConfig?.maxItems || 'Unlimited'}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <div className="mt-3 cursor-move">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium capitalize">{field.type}</span>
              {field.required && (
                <span className="text-xs text-red-500">Required</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor={`${field.id}-label`}>Field Label</Label>
              <Input
                id={`${field.id}-label`}
                value={field.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`${field.id}-help`}>Help Text</Label>
              <Textarea
                id={`${field.id}-help`}
                value={field.helpText || ''}
                onChange={(e) => handleHelpTextChange(e.target.value)}
                className="mt-1"
                placeholder="Optional help text"
              />
            </div>

            {renderFieldConfig()}

            <div className="flex items-center gap-2">
              <Switch
                id={`${field.id}-required`}
                checked={field.required}
                onCheckedChange={handleRequiredChange}
              />
              <Label htmlFor={`${field.id}-required`}>Required field</Label>
            </div>

            {field.type === 'file' && (
              <div>
                <Label>Preview</Label>
                <div className="mt-1">
                  <FileUpload
                    accept={field.fileConfig?.accept}
                    maxSize={field.fileConfig?.maxSize}
                    onUpload={handleFileUpload}
                    onError={handleFileError}
                    value={field.value}
                    onRemove={handleFileRemove}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}