'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Trash2, Plus, PlusCircle, ChevronDown, ChevronRight, Settings2, Pencil, X, Copy, LayoutGrid, Files, Folder, FolderClosed, CheckSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { FileUploadResult } from '@/services/file-upload.service';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { AddFieldDialog } from './add-field-dialog';
import { FieldSettingsRenderer } from './field-settings-renderer';
import { createEmptyField, FIELD_TYPES } from './field-settings-utils';

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
  onDuplicate?: (field: FormField) => void;
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

export function FormField({
  field,
  onUpdate,
  onDelete,
  onDuplicate,
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
  const fieldsContainerRef = useRef<HTMLDivElement>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(true);
  const [isGroupCollapsed, setIsGroupCollapsed] = useState(true);
  const [isRepeatableCollapsed, setIsRepeatableCollapsed] = useState(true);

  // Function to scroll to the bottom of the fields container
  const scrollToBottom = () => {
    if (fieldsContainerRef.current) {
      const container = fieldsContainerRef.current;
      setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100); // Small delay to ensure the new field is rendered
    }
  };

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
    if (field.sectionConfig) {
      const newFields = [...field.sectionConfig.fields];
      newFields[index] = updatedField;

      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: newFields,
        },
      });
    } else if (field.repeatableConfig) {
      const newFields = [...field.repeatableConfig.fields];
      newFields[index] = updatedField;

      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: newFields,
        },
      });
    } else if (field.groupConfig) {
      const newFields = [...field.groupConfig.fields];
      newFields[index] = updatedField;

      onUpdate({
        ...field,
        groupConfig: {
          ...field.groupConfig,
          fields: newFields,
        },
      });
    }
  };

  const handleDeleteField = (index: number) => {
    if (field.sectionConfig) {
      const newFields = [...field.sectionConfig.fields];
      newFields.splice(index, 1);

      onUpdate({
        ...field,
        sectionConfig: {
          ...field.sectionConfig,
          fields: newFields,
        },
      });
    } else if (field.repeatableConfig) {
      const newFields = [...field.repeatableConfig.fields];
      newFields.splice(index, 1);

      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: newFields,
        },
      });
    } else if (field.groupConfig) {
      const newFields = [...field.groupConfig.fields];
      newFields.splice(index, 1);

      onUpdate({
        ...field,
        groupConfig: {
          ...field.groupConfig,
          fields: newFields,
        },
      });
    }
  };

  const handleAddField = (newField: FormField) => {
    // Ensure the new field has a valid UUID
    const fieldWithUUID = {
      ...newField,
      id: newField.id || crypto.randomUUID()
    };

    if (field.sectionConfig) {
      if (fieldWithUUID.type === 'section') {
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
          fields: [...field.sectionConfig.fields, fieldWithUUID],
        },
      });
      scrollToBottom();
    } else if (field.repeatableConfig) {
      if (!field.repeatableConfig.fields) {
        field.repeatableConfig.fields = [];
      }

      onUpdate({
        ...field,
        repeatableConfig: {
          ...field.repeatableConfig,
          fields: [...field.repeatableConfig.fields, fieldWithUUID],
        },
      });
      scrollToBottom();
    } else if (field.groupConfig) {
      if (!field.groupConfig.fields) {
        field.groupConfig.fields = [];
      }
      
      onUpdate({
        ...field,
        groupConfig: {
          ...field.groupConfig,
          fields: [...field.groupConfig.fields, fieldWithUUID],
        },
      });
      scrollToBottom();
    }
    setIsAddingField(false);
  };

  const renderFieldSettings = (field: FormField, onUpdate: (field: FormField) => void) => {
    return (
      <FieldSettingsRenderer 
        field={field} 
        onUpdate={onUpdate} 
      />
    );
  };

  // Update the InsertFieldButton implementation
  const InsertFieldButton = ({ onClick }: { onClick: () => void }) => (
    <div className="flex justify-center h-0">
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
        className="h-6 w-6 p-0 rounded-full bg-muted hover:bg-primary/20 hover:text-primary translate-y-[-50%] border-dashed border-primary/40 opacity-0 group-hover/field:opacity-60 hover:opacity-100 transition-all"
        title="Add field here"
      >
        <PlusCircle className="h-4 w-4" />
      </Button>
    </div>
  );

  if (field.type === 'section') {
    return (
      <div className="p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors relative overflow-hidden group/section">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary/20"></div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
                >
                  {isSectionCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <LayoutGrid className="h-4 w-4 text-primary/80 mr-2" />
                <div className="relative flex-1 group/title">
                  <Input
                    value={field.label}
                    onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                    className="font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none bg-transparent peer pr-8"
                    placeholder="Section Title"
                  />
                  <Pencil className="h-3.5 w-3.5 text-primary/60 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded" />
                </div>
                
                {isSectionCollapsed && field.sectionConfig?.fields && field.sectionConfig.fields.length > 0 && (
                  <div className="ml-2 text-xs px-2 py-1 bg-muted/30 rounded-full text-muted-foreground">
                    {field.sectionConfig.fields.length} {field.sectionConfig.fields.length === 1 ? 'field' : 'fields'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
                className={cn(
                  "h-8 px-2 rounded-md border transition-all duration-200",
                  !isSectionCollapsed 
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                    : "bg-background border-muted-foreground/30 hover:border-primary hover:text-primary"
                )}
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">{!isSectionCollapsed ? "Close" : "Settings"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive/70 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isSectionCollapsed && (
            <>
              <div className="flex items-center justify-between border-t pt-4">
                <h3 className="text-sm font-medium">Section Fields</h3>
                <Button
                  variant="default"
                  size="sm"
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
                      ref={(el) => {
                        provided.innerRef(el);
                        // @ts-ignore - This is fine since we're combining refs
                        fieldsContainerRef.current = el;
                      }}
                      className="space-y-2"
                    >
                      {/* Add a button to insert at the top if there are fields */}
                      {field.sectionConfig?.fields && field.sectionConfig.fields.length > 0 && (
                        <InsertFieldButton
                          onClick={() => {
                            const newField = createEmptyField('text', 'New Field');
                            const updatedFields = [
                              newField,
                              ...field.sectionConfig!.fields
                            ];
                            onUpdate({
                              ...field,
                              sectionConfig: {
                                ...field.sectionConfig!,
                                fields: updatedFields
                              }
                            });
                          }}
                        />
                      )}
                      
                      {field.sectionConfig?.fields.map((subfield, index) => (
                        <div key={subfield.id} className="group/field space-y-0">
                          <Draggable
                            draggableId={subfield.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:bg-muted/60 active:cursor-grabbing p-1 rounded transition-colors">
                                    <GripVertical className="h-5 w-5 text-muted-foreground/60 group-hover/field:text-muted-foreground/80 transition-colors" />
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
                          
                          {/* Add insert button after each field */}
                          <InsertFieldButton
                            onClick={() => {
                              const newField = createEmptyField('text', 'New Field');
                              const updatedFields = [...field.sectionConfig!.fields];
                              updatedFields.splice(index + 1, 0, newField);
                              onUpdate({
                                ...field,
                                sectionConfig: {
                                  ...field.sectionConfig!,
                                  fields: updatedFields
                                }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {(!field.sectionConfig?.fields || field.sectionConfig.fields.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-md bg-muted/20 transition-all hover:bg-muted/30 hover:border-primary/30">
                  <LayoutGrid className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No fields added yet</p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsAddingField(true)}
                    className="mt-2"
                  >
                    Add First Field
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <AddFieldDialog
          open={isAddingField}
          onOpenChange={setIsAddingField}
          onAdd={handleAddField}
        />
      </div>
    );
  }

  if (field.type === 'repeatable') {
    return (
      <div className="p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors relative overflow-hidden group/repeatable">
        <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30"></div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsRepeatableCollapsed(!isRepeatableCollapsed)}
                >
                  {isRepeatableCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <Files className="h-4 w-4 text-primary/80 mr-2" />
                <div className="relative flex-1 group/title">
                  <Input
                    value={field.label}
                    onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                    className="font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none bg-transparent peer"
                    placeholder="Repeatable Group Title"
                  />
                  <Pencil className="h-3.5 w-3.5 text-primary/60 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded" />
                </div>
                
                {isRepeatableCollapsed && field.repeatableConfig?.fields && field.repeatableConfig.fields.length > 0 && (
                  <div className="ml-2 text-xs px-2 py-1 bg-muted/30 rounded-full text-muted-foreground">
                    {field.repeatableConfig.fields.length} {field.repeatableConfig.fields.length === 1 ? 'field' : 'fields'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRepeatableCollapsed(!isRepeatableCollapsed)}
                className={cn(
                  "h-8 px-2 rounded-md border transition-all duration-200",
                  !isRepeatableCollapsed 
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                    : "bg-background border-muted-foreground/30 hover:border-primary hover:text-primary"
                )}
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">{!isRepeatableCollapsed ? "Close" : "Settings"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive/70 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isRepeatableCollapsed && (
            <>
              <div className="flex items-center justify-between border-t pt-4">
                <h3 className="text-sm font-medium">Repeatable Fields</h3>
                <Button
                  variant="default"
                  size="sm"
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
                      ref={(el) => {
                        provided.innerRef(el);
                        // @ts-ignore - This is fine since we're combining refs
                        fieldsContainerRef.current = el;
                      }}
                      className="space-y-2"
                    >
                      {/* Add a button to insert at the top if there are fields */}
                      {field.repeatableConfig?.fields && field.repeatableConfig.fields.length > 0 && (
                        <InsertFieldButton
                          onClick={() => {
                            const newField = createEmptyField('text', 'New Field');
                            const updatedFields = [
                              newField,
                              ...field.repeatableConfig!.fields
                            ];
                            onUpdate({
                              ...field,
                              repeatableConfig: {
                                ...field.repeatableConfig!,
                                fields: updatedFields
                              }
                            });
                          }}
                        />
                      )}
                      
                      {field.repeatableConfig?.fields.map((subfield, index) => (
                        <div key={subfield.id} className="group/field space-y-0">
                          <Draggable
                            draggableId={subfield.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:bg-muted/60 active:cursor-grabbing p-1 rounded transition-colors">
                                    <GripVertical className="h-5 w-5 text-muted-foreground/60 group-hover/field:text-muted-foreground/80 transition-colors" />
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
                          
                          {/* Add insert button after each field */}
                          <InsertFieldButton
                            onClick={() => {
                              const newField = createEmptyField('text', 'New Field');
                              const updatedFields = [...field.repeatableConfig!.fields];
                              updatedFields.splice(index + 1, 0, newField);
                              onUpdate({
                                ...field,
                                repeatableConfig: {
                                  ...field.repeatableConfig!,
                                  fields: updatedFields
                                }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {(!field.repeatableConfig?.fields || field.repeatableConfig.fields.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-md bg-muted/20 transition-all hover:bg-muted/30 hover:border-primary/30">
                  <Files className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No fields added yet</p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsAddingField(true)}
                    className="mt-2"
                  >
                    Add First Field
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <AddFieldDialog
          open={isAddingField}
          onOpenChange={setIsAddingField}
          onAdd={handleAddField}
        />
      </div>
    );
  }

  if (field.type === 'group') {
    return (
      <div className="p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors relative overflow-hidden group/group">
        <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/30"></div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsGroupCollapsed(!isGroupCollapsed)}
                >
                  {isGroupCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
                <FolderClosed className="h-4 w-4 text-primary/80 mr-2" />
                <div className="relative flex-1 group/title">
                  <Input
                    value={field.label}
                    onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                    className="font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none bg-transparent peer pr-8"
                    placeholder="Group Title"
                  />
                  <Pencil className="h-3.5 w-3.5 text-primary/60 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded" />
                </div>
                
                {isGroupCollapsed && field.groupConfig?.fields && field.groupConfig.fields.length > 0 && (
                  <div className="ml-2 text-xs px-2 py-1 bg-muted/30 rounded-full text-muted-foreground">
                    {field.groupConfig.fields.length} {field.groupConfig.fields.length === 1 ? 'field' : 'fields'}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGroupCollapsed(!isGroupCollapsed)}
                className={cn(
                  "h-8 px-2 rounded-md border transition-all duration-200",
                  !isGroupCollapsed 
                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90" 
                    : "bg-background border-muted-foreground/30 hover:border-primary hover:text-primary"
                )}
              >
                <Settings2 className="h-4 w-4 mr-1.5" />
                <span className="text-xs font-medium">{!isGroupCollapsed ? "Close" : "Settings"}</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-8 w-8 text-destructive/70 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isGroupCollapsed && (
            <>
              <div className="flex items-center justify-between border-t pt-4">
                <h3 className="text-sm font-medium">Group Fields</h3>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsAddingField(true)}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Field
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`group-${field.id}`}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={(el) => {
                        provided.innerRef(el);
                        // @ts-ignore - This is fine since we're combining refs
                        fieldsContainerRef.current = el;
                      }}
                      className="space-y-2"
                    >
                      {/* Add a button to insert at the top if there are fields */}
                      {field.groupConfig?.fields && field.groupConfig.fields.length > 0 && (
                        <InsertFieldButton
                          onClick={() => {
                            const newField = createEmptyField('text', 'New Field');
                            const updatedFields = [
                              newField,
                              ...field.groupConfig!.fields
                            ];
                            onUpdate({
                              ...field,
                              groupConfig: {
                                ...field.groupConfig!,
                                fields: updatedFields
                              }
                            });
                          }}
                        />
                      )}
                      
                      {field.groupConfig?.fields.map((subfield, index) => (
                        <div key={subfield.id} className="group/field space-y-0">
                          <Draggable
                            draggableId={subfield.id}
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div className="flex items-center gap-2">
                                  <div {...provided.dragHandleProps} className="cursor-grab hover:bg-muted/60 active:cursor-grabbing p-1 rounded transition-colors">
                                    <GripVertical className="h-5 w-5 text-muted-foreground/60 group-hover/field:text-muted-foreground/80 transition-colors" />
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
                          
                          {/* Add insert button after each field */}
                          <InsertFieldButton
                            onClick={() => {
                              const newField = createEmptyField('text', 'New Field');
                              const updatedFields = [...field.groupConfig!.fields];
                              updatedFields.splice(index + 1, 0, newField);
                              onUpdate({
                                ...field,
                                groupConfig: {
                                  ...field.groupConfig!,
                                  fields: updatedFields
                                }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {(!field.groupConfig?.fields || field.groupConfig.fields.length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-md bg-muted/20 transition-all hover:bg-muted/30 hover:border-primary/30">
                  <FolderClosed className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">No fields added yet</p>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsAddingField(true)}
                    className="mt-2"
                  >
                    Add First Field
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <AddFieldDialog
          open={isAddingField}
          onOpenChange={setIsAddingField}
          onAdd={handleAddField}
        />
      </div>
    );
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

  const handleFileUpload = (file: File) => {
    // Create a temporary FileUploadResult-like object
    const fileResult = {
      path: '',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type
    };
    onUpdate({ ...field, value: fileResult });
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

  const fieldTypeData = FIELD_TYPES.find(t => t.type === field.type);
  const FieldIcon = fieldTypeData?.icon;

  // Standard fields (text, textarea, email, etc)
  return (
    <div className={cn(
      "group/field flex border rounded-lg overflow-hidden transition-all duration-200",
      isDragging ? "opacity-70 border-dashed border-primary/50 shadow-sm" : "hover:border-primary/50 border-solid shadow-sm hover:shadow-md",
      isExpanded && "border-primary shadow-md",
      isValidDropTarget && "ring-2 ring-primary/30"
    )}>
      <div className="flex-1 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between h-8">
            <div className="flex items-center flex-1">
              {FieldIcon && <FieldIcon className="h-4 w-4 text-primary/80 mr-2 shrink-0" />}
              <div className="relative flex-1 group/title">
                <Input
                  value={field.label}
                  onChange={(e) => onUpdate({ ...field, label: e.target.value })}
                  className="font-medium border-0 px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none bg-transparent peer pr-8 h-8"
                  placeholder={`${field.type.charAt(0).toUpperCase() + field.type.slice(1)} field`}
                />
                <Pencil className="h-3.5 w-3.5 text-primary/60 absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/title:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "h-8 px-2 rounded-md border transition-all duration-200",
                  isExpanded 
                    ? "bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary" 
                    : "bg-background border-muted-foreground/20 text-muted-foreground hover:border-primary/50 hover:text-primary"
                )}
                title={isExpanded ? "Close settings" : "Open settings"}
              >
                <Settings2 className={cn("h-4 w-4 mr-1.5", !isExpanded && "opacity-70")} />
                <span className="text-xs font-medium">{isExpanded ? "Close" : "Settings"}</span>
              </Button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t">
              <div className="bg-muted/20 rounded-lg p-3 transition-all hover:bg-muted/30">
                {renderFieldSettings(field, onUpdate)}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col border-l bg-muted/10 divide-y divide-border/30">
        <Button
          variant="ghost"
          className="h-10 px-3 rounded-none hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary flex items-center gap-1.5"
          onClick={() => {
            onUpdate({
              ...field,
              required: !field.required,
            });
          }}
          title={field.required ? "Make optional" : "Make required"}
        >
          <CheckSquare className={cn(
            "h-4 w-4", 
            field.required ? "text-primary" : "text-muted-foreground/60"
          )} />
          <span className="text-xs">{field.required ? "Required" : "Optional"}</span>
        </Button>
        <Button
          variant="ghost"
          className="h-10 px-3 rounded-none hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive flex items-center gap-1.5"
          onClick={onDelete}
          title="Delete field"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-xs">Delete</span>
        </Button>
      </div>
    </div>
  );
}