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
import { Textarea } from '@/components/ui/textarea';
import { FormField } from './form-field';
import { FieldSettingsRenderer } from './field-settings-renderer';
import { FIELD_TYPES, createEmptyField } from './field-settings-utils';

interface AddFieldDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: FormField) => void;
}

export function AddFieldDialog({ open, onOpenChange, onAdd }: AddFieldDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [field, setField] = useState<FormField | null>(null);

  const handleFieldChange = (updates: Partial<FormField>) => {
    if (!field) return;
    setField({ ...field, ...updates });
  };

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    // Create a new field with default settings using our utility
    setField(createEmptyField(type, ''));
  };

  const handleClose = () => {
    setSelectedType(null);
    setField(null);
    onOpenChange(false);
  };

  const handleAdd = () => {
    if (!field) return;
    
    // Ensure we have a valid field name
    if (!field.label.trim()) {
      field.label = `New ${field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field`;
    }
    
    onAdd(field);
    handleClose();
  };

  // Render the field type selector when no type is selected
  const renderFieldTypes = () => (
    <div className="grid grid-cols-2 gap-3 mt-4">
      {FIELD_TYPES.map((fieldType) => (
        <button
          key={fieldType.type}
          className="flex flex-col items-center p-4 border rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors text-center gap-2"
          onClick={() => handleSelectType(fieldType.type)}
        >
          <fieldType.icon className="h-5 w-5 text-primary/70" />
          <div className="font-medium text-sm">{fieldType.label}</div>
          <div className="text-xs text-muted-foreground">{fieldType.description}</div>
        </button>
      ))}
          </div>
        );

  // Render the field configuration once a type is selected
  const renderFieldEditor = () => {
    if (!field) return null;

        return (
      <div className="space-y-4 mt-4">
            <div>
          <Label htmlFor="label">Field Label</Label>
              <Input
            id="label"
            value={field.label}
            onChange={(e) => handleFieldChange({ label: e.target.value })}
            placeholder={`New ${field.type.charAt(0).toUpperCase() + field.type.slice(1)} Field`}
              />
            </div>

        {/* Use our shared field settings renderer */}
        <FieldSettingsRenderer 
          field={field} 
          onUpdate={setField} 
          compact={true} 
        />
          </div>
        );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedType 
              ? `Configure ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Field` 
              : 'Add New Field'}
          </DialogTitle>
          <DialogDescription>
            {selectedType 
              ? 'Configure the settings for this field' 
              : 'Select a field type to add to your form'}
          </DialogDescription>
        </DialogHeader>

        {selectedType ? renderFieldEditor() : renderFieldTypes()}

        <DialogFooter>
          {selectedType ? (
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={() => setSelectedType(null)}>
                Back to Field Types
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>
                  Add Field
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 