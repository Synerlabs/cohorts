'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { FormField, type FormField as FormFieldType } from './form-field';
import { AddFieldDialog } from './add-field-dialog';
import { useToast } from '@/components/ui/use-toast';
import { createFormTemplate, updateFormTemplate } from '../_actions/form-template.action';
import { Database } from '@/lib/types/database.types';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormSchema {
  version: number;
  fields: FormFieldType[];
}

interface FormBuilderProps {
  orgId: string;
  template?: FormTemplate;
  mode?: 'create' | 'edit';
}

export function FormBuilder({ orgId, template, mode = 'create' }: FormBuilderProps) {
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [fields, setFields] = useState<FormFieldType[]>(() => {
    if (!template?.schema) return [];
    const schema = template.schema as unknown as FormSchema;
    return schema.fields || [];
  });
  const [isAddingField, setIsAddingField] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFields(items);
  };

  const handleAddField = (field: FormFieldType) => {
    setFields([...fields, field]);
    setIsAddingField(false);
  };

  const handleUpdateField = (index: number, field: FormFieldType) => {
    const newFields = [...fields];
    newFields[index] = field;
    setFields(newFields);
  };

  const handleDeleteField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a form title',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one field',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const formData = {
        title: title.trim(),
        description: description.trim(),
        fields,
      };

      const result = mode === 'create'
        ? await createFormTemplate({ ...formData, orgId })
        : await updateFormTemplate(template!.id, formData);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: `Form template ${mode === 'create' ? 'created' : 'updated'} successfully`,
      });

      router.push(`/${orgId}/forms`);
    } catch (error) {
      console.error('Error saving form template:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save form template',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Form Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter form title"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter form description"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Form Fields</h2>
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
            <Droppable droppableId="fields">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {fields.map((field, index) => (
                    <Draggable
                      key={field.id}
                      draggableId={field.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <FormField
                            field={field}
                            onUpdate={(updatedField: FormFieldType) =>
                              handleUpdateField(index, updatedField)
                            }
                            onDelete={() => handleDeleteField(index)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {fields.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No fields added yet. Click &quot;Add Field&quot; to start building
              your form.
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create Form' : 'Save Changes'}
        </Button>
      </div>

      <AddFieldDialog
        open={isAddingField}
        onOpenChange={setIsAddingField}
        onAdd={handleAddField}
      />
    </div>
  );
} 