'use client';

import { FormField } from './form-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface FieldSettingsRendererProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  compact?: boolean; // For more compact layout in the add-field dialog
}

export function FieldSettingsRenderer({ field, onUpdate, compact = false }: FieldSettingsRendererProps) {
  const handleConfigChange = <T extends keyof FormField>(
    configKey: T,
    updates: Partial<FormField[T]>
  ) => {
    onUpdate({
      ...field,
      [configKey]: {
        ...(field[configKey] as any),
        ...updates,
      },
    });
  };

  // Common layout setting for all field types
  const renderCommonSettings = () => (
    <div className={compact ? "space-y-3" : "space-y-4 mt-4"}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="helpText">Help Text</Label>
          <Textarea
            id="helpText"
            value={field.helpText || ''}
            onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
            placeholder="Enter help text for this field (optional)"
            className="resize-none min-h-[60px]"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="required">Required Field</Label>
          <Switch
            id="required"
            checked={field.required || false}
            onCheckedChange={(checked) => onUpdate({ ...field, required: checked })}
          />
        </div>
      </div>
    </div>
  );

  // Switch based on field type to show appropriate settings
  switch (field.type) {
    case 'text':
    case 'textarea':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Text Settings</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="minLength">Min Length</Label>
                <Input
                  id="minLength"
                  type="number"
                  min={0}
                  value={field.textConfig?.minLength || ''}
                  onChange={(e) => handleConfigChange('textConfig', { 
                    minLength: e.target.value ? parseInt(e.target.value) : undefined 
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
                  onChange={(e) => handleConfigChange('textConfig', { 
                    maxLength: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                />
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={field.textConfig?.placeholder || ''}
                onChange={(e) => handleConfigChange('textConfig', { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'number':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Number Settings</Label>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <Label htmlFor="min">Min Value</Label>
                <Input
                  id="min"
                  type="number"
                  value={field.numberConfig?.min || ''}
                  onChange={(e) => handleConfigChange('numberConfig', { 
                    min: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="max">Max Value</Label>
                <Input
                  id="max"
                  type="number"
                  value={field.numberConfig?.max || ''}
                  onChange={(e) => handleConfigChange('numberConfig', { 
                    max: e.target.value ? parseFloat(e.target.value) : undefined 
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
                  onChange={(e) => handleConfigChange('numberConfig', { 
                    step: parseFloat(e.target.value) || 1 
                  })}
                />
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={field.numberConfig?.placeholder || ''}
                onChange={(e) => handleConfigChange('numberConfig', { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'email':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Email Settings</Label>
            <div className="mt-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={field.emailConfig?.placeholder || ''}
                onChange={(e) => handleConfigChange('emailConfig', { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
            <div className="mt-2">
              <Label>Allowed Domains (Optional)</Label>
              <Textarea
                value={field.emailConfig?.allowedDomains?.join('\n') || ''}
                onChange={(e) => handleConfigChange('emailConfig', {
                  allowedDomains: e.target.value ? e.target.value.split('\n').map(d => d.trim()) : [],
                })}
                placeholder="Enter one domain per line"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'phone':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Phone Settings</Label>
            <div className="mt-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={field.phoneConfig?.placeholder || ''}
                onChange={(e) => handleConfigChange('phoneConfig', { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'date':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Date Settings</Label>
            <div className="mt-2">
              <Label htmlFor="placeholder">Placeholder</Label>
              <Input
                id="placeholder"
                value={field.dateConfig?.placeholder || ''}
                onChange={(e) => handleConfigChange('dateConfig', { placeholder: e.target.value })}
                placeholder="Enter placeholder text"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'select':
    case 'radio':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>{field.type === 'select' ? 'Dropdown' : 'Multiple Choice'} Settings</Label>
            <div className="mt-2">
              {field.type === 'select' && (
                <div className="mb-3">
                  <Label htmlFor="placeholder">Placeholder</Label>
                  <Input
                    id="placeholder"
                    value={field.selectConfig?.placeholder || ''}
                    onChange={(e) => handleConfigChange('selectConfig', { placeholder: e.target.value })}
                    placeholder="Enter placeholder text"
                  />
                </div>
              )}
              
              <Label>Options</Label>
              <div className="space-y-2 mt-1">
                {(field.options || []).map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...(field.options || [])];
                        newOptions[index] = {
                          ...newOptions[index],
                          label: e.target.value,
                          value: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                        };
                        onUpdate({ ...field, options: newOptions });
                      }}
                      placeholder="Option label"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newOptions = [...(field.options || [])];
                        newOptions.splice(index, 1);
                        onUpdate({ ...field, options: newOptions });
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
                    onUpdate({ ...field, options: newOptions });
                  }}
                >
                  Add Option
                </Button>
              </div>
            </div>
            
            {field.type === 'radio' && (
              <div className="mt-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowOther"
                    checked={field.choiceConfig?.allowOther || false}
                    onCheckedChange={(checked) => handleConfigChange('choiceConfig', {
                      allowOther: Boolean(checked),
                    })}
                  />
                  <Label htmlFor="allowOther">Allow &quot;Other&quot; option</Label>
                </div>
              </div>
            )}
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'file':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
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
                  onChange={(e) => handleConfigChange('fileConfig', {
                    maxSize: parseInt(e.target.value) * 1024 * 1024,
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
                  onChange={(e) => handleConfigChange('fileConfig', {
                    maxFiles: parseInt(e.target.value) || 1,
                  })}
                />
              </div>
            </div>
            <div className="mt-2">
              <Label>Allowed File Types</Label>
              <Input
                value={field.fileConfig?.accept || ''}
                onChange={(e) => handleConfigChange('fileConfig', {
                  accept: e.target.value,
                })}
                placeholder=".pdf,.doc,.docx"
              />
              <div className="text-xs text-muted-foreground mt-1">
                Enter file extensions separated by commas (e.g., .pdf,.doc,.docx)
              </div>
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    // Container-type fields have simpler settings in this view
    case 'repeatable':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Repeatable Settings</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <Label htmlFor="minItems">Min Items</Label>
                <Input
                  id="minItems"
                  type="number"
                  min={0}
                  value={field.repeatableConfig?.minItems || 1}
                  onChange={(e) => handleConfigChange('repeatableConfig', {
                    minItems: parseInt(e.target.value) || 1,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="maxItems">Max Items</Label>
                <Input
                  id="maxItems"
                  type="number"
                  min={0}
                  value={field.repeatableConfig?.maxItems || ''}
                  onChange={(e) => handleConfigChange('repeatableConfig', {
                    maxItems: e.target.value ? parseInt(e.target.value) : undefined,
                  })}
                />
              </div>
            </div>
            <div className="mt-2">
              <Label htmlFor="itemLabel">Item Label</Label>
              <Input
                id="itemLabel"
                value={field.repeatableConfig?.itemLabel || 'Item'}
                onChange={(e) => handleConfigChange('repeatableConfig', {
                  itemLabel: e.target.value,
                })}
                placeholder="Item"
              />
            </div>
            <div className="mt-2">
              <Label htmlFor="addLabel">Add Button Label</Label>
              <Input
                id="addLabel"
                value={field.repeatableConfig?.addLabel || 'Add Item'}
                onChange={(e) => handleConfigChange('repeatableConfig', {
                  addLabel: e.target.value,
                })}
                placeholder="Add Item"
              />
            </div>
          </div>
          {renderCommonSettings()}
        </div>
      );

    case 'signature':
      return (
        <div className={compact ? "space-y-3" : "space-y-4"}>
          <div>
            <Label>Signature Settings</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Signature fields allow users to draw their signature using mouse or touch.
              Signatures are saved as images that can be reviewed later.
            </p>
          </div>
          {renderCommonSettings()}
        </div>
      );

    default:
      return renderCommonSettings();
  }
} 