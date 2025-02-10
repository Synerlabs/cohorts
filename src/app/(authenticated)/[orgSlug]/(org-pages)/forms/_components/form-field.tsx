'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, Plus, PlusCircle, ChevronDown, ChevronRight, Settings2, Type, AlignLeft, Mail, Hash, Phone, Calendar, Clock, CircleDot, CheckSquare, ChevronsUpDown, Upload, Files, LayoutGrid, Folder } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { FileUploadResult } from '@/services/file-upload.service';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AddFieldDialog } from './add-field-dialog';

export interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'email' | 'phone' | 'date' | 'select' | 'file' | 'repeatable' | 'section' | 'group' | 'checkbox' | 'number' | 'radio';
  label: string;
  required?: boolean;
  helpText?: string;
  value?: any;
  textConfig?: {
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
    helpText?: string;
  };
  numberConfig?: {
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
    helpText?: string;
  };
  emailConfig?: {
    placeholder?: string;
    helpText?: string;
    allowedDomains?: string[];
  };
  phoneConfig?: {
    placeholder?: string;
    helpText?: string;
  };
  dateConfig?: {
    placeholder?: string;
    helpText?: string;
  };
  selectConfig?: {
    options: { label: string; value: string }[];
    placeholder?: string;
    helpText?: string;
  };
  fileConfig?: {
    maxSize?: number;
    maxFiles?: number;
    accept?: string;
    allowedTypes?: string[];
    helpText?: string;
  };
  repeatableConfig?: {
    fields: FormField[];
    showTitle?: boolean;
    description?: string;
    minItems?: number;
    maxItems?: number;
    addLabel?: string;
    itemLabel?: string;
  };
  sectionConfig?: {
    fields: FormField[];
    showTitle?: boolean;
    description?: string;
  };
  groupConfig?: {
    fields: FormField[];
    showTitle?: boolean;
    description?: string;
  };
  checkboxConfig?: {
    label?: string;
    helpText?: string;
  };
  choiceConfig?: {
    layout?: 'vertical' | 'horizontal';
    allowOther?: boolean;
    otherLabel?: string;
  };
  options?: { label: string; value: string; description?: string }[];
}

interface FormFieldProps {
  field: FormField;
  onUpdate: (field: FormField) => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent, field: FormField) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, targetField: FormField) => void;
  isDragging?: boolean;
  isValidDropTarget?: boolean;
  path?: string[];
  level?: number;
  totalSections?: number;
  isPreview?: boolean;
}

const FIELD_ICONS = {
  text: Type,
  textarea: AlignLeft,
  email: Mail,
  number: Hash,
  phone: Phone,
  date: Calendar,
  time: Clock,
  radio: CircleDot,
  checkbox: CheckSquare,
  select: ChevronsUpDown,
  file: Upload,
  repeatable: Files,
  section: LayoutGrid,
  group: Folder,
} as const;

export function FormField({
  field,
  onUpdate,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  isValidDropTarget,
  path = [],
  level = 0,
  totalSections = 1,
  isPreview = false,
}: FormFieldProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart?.(e, field);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    if (field.sectionConfig) {
      const newFields = Array.from(field.sectionConfig.fields);
      const [reorderedItem] = newFields.splice(result.source.index, 1);
      newFields.splice(result.destination.index, 0, reorderedItem);

      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: newFields,
        },
      });
    } else if (field.repeatableConfig) {
      const newFields = Array.from(field.repeatableConfig.fields);
      const [reorderedItem] = newFields.splice(result.source.index, 1);
      newFields.splice(result.destination.index, 0, reorderedItem);

      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: newFields,
        },
      });
    }
  };

  const handleUpdateField = (index: number, updatedField: FormField) => {
    if (!field.sectionConfig) return;

    const newFields = [...field.sectionConfig.fields];
    newFields[index] = updatedField;

    onUpdate({
      ...field,
      sectionConfig: {
        ...field.sectionConfig,
        fields: newFields,
      },
    });
  };

  const handleDeleteField = (index: number) => {
    if (!field.sectionConfig) return;

    onUpdate({
      ...field,
      sectionConfig: {
        ...field.sectionConfig,
        fields: field.sectionConfig.fields.filter((f, i) => i !== index),
      },
    });
  };

  const handleAddField = (newField: FormField) => {
    if (field.sectionConfig) {
      if (newField.type === 'section') {
        toast({
          title: 'Error',
          description: 'Cannot add a section within another section',
          variant: 'destructive',
        });
        return;
      }
      
      if (!field.sectionConfig.fields) {
        field.sectionConfig.fields = [];
      }
      
      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: [...field.sectionConfig.fields, newField],
        },
      });
    } else if (field.repeatableConfig) {
      if (!field.repeatableConfig.fields) {
        field.repeatableConfig.fields = [];
      }

      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: [...field.repeatableConfig.fields, newField],
        },
      });
    }
    setIsAddingField(false);
  };

  const renderFieldSettings = (field: FormField, onUpdate: (field: FormField) => void) => {
    switch (field.type) {
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
                    onChange={(e) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                  onChange={(e) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                  onChange={(e) => onUpdate({
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
                  onChange={(e) => onUpdate({
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
                  onChange={(e) => onUpdate({
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
                          onUpdate({
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
                          onUpdate({
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
                      onUpdate({
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
                  onCheckedChange={(checked) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                    onChange={(e) => onUpdate({
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
                  onChange={(e) => onUpdate({
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

      default:
        return null;
    }
  };

  if (field.type === 'section') {
    const content = (dragHandleProps?: any) => (
      <Card className="p-6">
        <div className="space-y-4">
          {totalSections > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {dragHandleProps && (
                  <div {...dragHandleProps}>
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    value={field.label}
                    onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                    className="font-semibold text-lg"
                    placeholder="Section Title"
                    required={totalSections > 1}
                  />
                  <Textarea
                    value={field.sectionConfig?.description || ''}
                    onChange={(e) =>
                      onUpdate({
                        ...field,
                        sectionConfig: {
                          ...field.sectionConfig!,
                          description: e.target.value,
                        },
                      })
                    }
                    className="mt-2"
                    placeholder="Section Description (optional)"
                  />
                </div>
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
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {totalSections === 1 ? 'Form Fields' : 'Section Fields'}
            </h3>
            <Button
              variant="outline"
              onClick={() => setIsAddingField(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Field
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`section-${field.id}`}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {field.sectionConfig?.fields?.map((subfield, index) => (
                    <Draggable
                      key={subfield.id}
                      draggableId={subfield.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                            </div>
                            <div className="flex-1">
                              <FormField
                                field={subfield}
                                onUpdate={(updatedField) =>
                                  handleUpdateField(index, updatedField)
                                }
                                onDelete={() => handleDeleteField(index)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {(!field.sectionConfig?.fields || field.sectionConfig.fields.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No fields added yet. Click &quot;Add Field&quot; to start building
              this section.
            </div>
          )}
        </div>

        <AddFieldDialog
          open={isAddingField}
          onOpenChange={setIsAddingField}
          onAdd={(newField) => {
            handleAddField(newField);
            setIsAddingField(false);
          }}
        />
      </Card>
    );

    return (
      <>
        {totalSections > 1 ? (
          <Draggable draggableId={field.id} index={level}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
              >
                {content(provided.dragHandleProps)}
              </div>
            )}
          </Draggable>
        ) : (
          content()
        )}
      </>
    );
  }

  if (field.type === 'repeatable') {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                className="font-semibold"
                placeholder="Repeatable Group Title"
              />
              <Textarea
                value={field.helpText || ''}
                onChange={(e) => onUpdate({ ...field, helpText: e.target.value })}
                placeholder="Help text (optional)"
                className="mt-1"
              />
              <div className="flex items-center gap-4">
                <div>
                  <Label htmlFor={`${field.id}-min`}>Minimum Items</Label>
                  <Input
                    id={`${field.id}-min`}
                    type="number"
                    min={0}
                    value={field.repeatableConfig?.minItems || 0}
                    onChange={(e) => onUpdate({
                      ...field,
                      repeatableConfig: {
                        ...field.repeatableConfig!,
                        minItems: parseInt(e.target.value) || 0,
                        fields: field.repeatableConfig?.fields || [],
                      },
                    })}
                    className="mt-1 w-24"
                  />
                </div>
                <div>
                  <Label htmlFor={`${field.id}-max`}>Maximum Items</Label>
                  <Input
                    id={`${field.id}-max`}
                    type="number"
                    min={0}
                    value={field.repeatableConfig?.maxItems || ''}
                    onChange={(e) => onUpdate({
                      ...field,
                      repeatableConfig: {
                        ...field.repeatableConfig!,
                        maxItems: e.target.value ? parseInt(e.target.value) : undefined,
                        fields: field.repeatableConfig?.fields || [],
                      },
                    })}
                    className="mt-1 w-24"
                    placeholder="No limit"
                  />
                </div>
              </div>
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

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Repeatable Fields</h3>
            <Button
              variant="outline"
              onClick={() => setIsAddingField(true)}
              className="flex items-center gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Field
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`repeatable-${field.id}`}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {field.repeatableConfig?.fields.map((subfield, index) => (
                    <Draggable
                      key={subfield.id}
                      draggableId={subfield.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                        >
                          <div className="flex items-center gap-2">
                            <div {...provided.dragHandleProps}>
                              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                            </div>
                            <div className="flex-1">
                              <FormField
                                field={subfield}
                                onUpdate={(updatedField) =>
                                  handleUpdateField(index, updatedField)
                                }
                                onDelete={() => handleDeleteField(index)}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {(!field.repeatableConfig?.fields || field.repeatableConfig.fields.length === 0) && (
            <div className="text-center text-muted-foreground py-8">
              No fields added yet. Click &quot;Add Field&quot; to define the structure
              of repeatable items.
            </div>
          )}
        </div>

        <AddFieldDialog
          open={isAddingField}
          onOpenChange={setIsAddingField}
          onAdd={handleAddField}
        />
      </Card>
    );
  }

  if (field.type === 'group') {
    const content = (dragHandleProps?: any) => (
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isPreview && dragHandleProps && (
                <div {...dragHandleProps}>
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="space-y-1">
                <Input
                  value={field.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  className="font-medium"
                  placeholder="Group Title"
                />
                {field.groupConfig?.description && (
                  <Textarea
                    value={field.groupConfig.description}
                    onChange={(e) =>
                      onUpdate({
                        ...field,
                        groupConfig: {
                          ...field.groupConfig,
                          description: e.target.value,
                          fields: field.groupConfig?.fields || [],
                        },
                      })
                    }
                    placeholder="Group description (optional)"
                    className="mt-1"
                  />
                )}
              </div>
            </div>
            {!isPreview && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAddingField(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {field.groupConfig?.fields && field.groupConfig.fields.length > 0 && (
            <div className="space-y-3 pl-6">
              {field.groupConfig.fields.map((subfield, index) => (
                <FormField
                  key={subfield.id}
                  field={subfield}
                  onUpdate={(updatedField) =>
                    handleUpdateSubfield(index, updatedField)
                  }
                  onDelete={() => handleDeleteSubfield(index)}
                  path={[...path, field.id]}
                  level={index}
                  isPreview={isPreview}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    );

    return content();
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop?.(e, field);
  };

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
    if (!field.repeatableConfig && !field.sectionConfig) return;

    const newField: FormField = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'New Field',
      required: false,
    };

    if (field.repeatableConfig) {
      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: [...field.repeatableConfig.fields, newField],
        },
      });
    } else if (field.sectionConfig) {
      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: [...field.sectionConfig.fields, newField],
        },
      });
    }
  };

  const handleUpdateSubfield = (index: number, updatedField: FormField) => {
    if (field.type === 'group' && field.groupConfig) {
      const newFields = [...field.groupConfig.fields];
      newFields[index] = updatedField;
      onUpdate({
        ...field,
        groupConfig: {
          ...field.groupConfig,
          fields: newFields,
        },
      });
    } else if (field.repeatableConfig) {
      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: field.repeatableConfig.fields.map((f, i) => 
            i === index ? updatedField : f
          ),
        },
      });
    } else if (field.sectionConfig) {
      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: field.sectionConfig.fields.map((f, i) => 
            i === index ? updatedField : f
          ),
        },
      });
    }
  };

  const handleDeleteSubfield = (index: number) => {
    if (field.type === 'group' && field.groupConfig) {
      onUpdate({
        ...field,
        groupConfig: {
          ...field.groupConfig,
          fields: field.groupConfig.fields.filter((_, i) => i !== index),
        },
      });
    } else if (field.repeatableConfig) {
      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: field.repeatableConfig.fields.filter((_, i) => i !== index),
        },
      });
    } else if (field.sectionConfig) {
      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: field.sectionConfig.fields.filter((_, i) => i !== index),
        },
      });
    }
  };

  const handleSectionConfigChange = (updates: Partial<FormField['sectionConfig']>) => {
    if (!field.sectionConfig) return;

    onUpdate({
      ...field,
      sectionConfig: {
        ...field.sectionConfig,
        ...updates,
      },
    });
  };

  const renderSubfields = (fields: FormField[], containerClass?: string) => (
    <div className={cn('pl-4 border-l-2 space-y-4', containerClass)}>
      {fields.map((subfield, index) => (
        <FormField
          key={subfield.id}
          field={subfield}
          onUpdate={(updatedField) => handleUpdateSubfield(index, updatedField)}
          onDelete={() => handleDeleteSubfield(index)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
          path={[...path, index.toString()]}
          level={level + 1}
        />
      ))}
      {fields.length === 0 && (
        <div
          className={cn(
            'text-sm text-muted-foreground p-4 border-2 border-dashed rounded-md',
            isValidDropTarget && 'border-primary bg-primary/5'
          )}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isValidDropTarget
            ? 'Drop field here'
            : 'No fields added yet. Click "Add Field" to add a field or drag a field here.'}
        </div>
      )}
    </div>
  );

  return (
    <Card
      ref={cardRef}
      className={cn('p-4', {
        'opacity-50': isDragging,
        'border-primary': isValidDropTarget,
      })}
      draggable={!isPreview}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = FIELD_ICONS[field.type as keyof typeof FIELD_ICONS];
                  return Icon ? <Icon className="h-4 w-4 text-muted-foreground shrink-0" /> : null;
                })()}
                <div>
                  <div className="font-medium">{field.label || 'Untitled Field'}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{field.type}</span>
                    {field.required && (
                      <span className="text-xs text-red-500">Required</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {!isPreview && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 w-8"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-8 w-8 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="mt-4 space-y-4 border-t pt-4">
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

              <div className="flex items-center gap-2">
                <Switch
                  id={`${field.id}-required`}
                  checked={field.required}
                  onCheckedChange={(checked) => handleRequiredChange(checked)}
                />
                <Label htmlFor={`${field.id}-required`}>Required field</Label>
              </div>

              {renderFieldSettings(field, onUpdate)}

              {field.type === 'file' && !isPreview && (
                <div>
                  <Label>Preview</Label>
                  <div className="mt-1">
                    <FileUpload
                      accept={field.fileConfig?.accept}
                      maxSize={field.fileConfig?.maxSize}
                      onUpload={(file) => handleFileUpload(file)}
                      onError={(error) => handleFileError(error)}
                      value={field.value}
                      onRemove={handleFileRemove}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}