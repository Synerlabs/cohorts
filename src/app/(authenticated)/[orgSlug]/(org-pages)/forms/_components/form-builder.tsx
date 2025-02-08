'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle, LayoutTemplate } from 'lucide-react';
import { FormField, type FormField as FormFieldType } from './form-field';
import { AddFieldDialog } from './add-field-dialog';
import { useToast } from '@/components/ui/use-toast';
import { createFormTemplate, updateFormTemplate } from '../_actions/form-template.action';
import { Database } from '@/lib/types/database.types';
import { TemplateSelectionDialog } from './template-selection-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormPreview } from './form-preview';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormBuilderProps {
  orgId: string;
  template?: FormTemplate;
  mode?: 'create' | 'edit';
}

export function FormBuilder({ orgId, template, mode = 'create' }: FormBuilderProps) {
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [sections, setSections] = useState<FormFieldType[]>(() => {
    if (!template?.schema) return [createDefaultSection()];
    try {
      const schema = typeof template.schema === 'string' 
        ? JSON.parse(template.schema) 
        : template.schema;
      
      // Ensure fields arrays are initialized
      const fields = schema.fields?.map((field: FormFieldType) => {
        // Initialize section fields
        if (field.type === 'section') {
          return {
            ...field,
            sectionConfig: {
              ...field.sectionConfig,
              fields: field.sectionConfig?.fields || [],
            },
          };
        }
        // Initialize repeatable fields
        if (field.type === 'repeatable') {
          return {
            ...field,
            repeatableConfig: {
              ...field.repeatableConfig,
              fields: field.repeatableConfig?.fields || [],
            },
          };
        }
        return field;
      }) || [];

      return fields.length > 0 ? fields : [createDefaultSection()];
    } catch (error) {
      console.error('Error parsing schema:', error);
      return [createDefaultSection()];
    }
  });
  const [isAddingField, setIsAddingField] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(mode === 'create');
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  function createDefaultSection(): FormFieldType {
    return {
      id: crypto.randomUUID(),
      type: 'section',
      label: 'Default Section',
      required: false,
      sectionConfig: {
        description: '',
        fields: [],
      },
    };
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSections(items);
  };

  const handleAddSection = () => {
    const newSection: FormFieldType = {
      id: crypto.randomUUID(),
      type: 'section',
      label: 'New Section',
      required: false,
      sectionConfig: {
        description: '',
        fields: [],
      },
    };
    setSections([...sections, newSection]);
  };

  const handleUpdateSection = (index: number, section: FormFieldType) => {
    const newSections = [...sections];
    newSections[index] = section;
    setSections(newSections);
  };

  const handleDeleteSection = (index: number) => {
    if (sections.length <= 1) {
      toast({
        title: 'Error',
        description: 'Forms must have at least one section',
        variant: 'destructive',
      });
      return;
    }
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
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

    if (!sections.some(section => section.sectionConfig?.fields.length > 0)) {
      toast({
        title: 'Error',
        description: 'Please add at least one field to a section',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);

      const formData = {
        title: title.trim(),
        description: description.trim(),
        fields: sections,
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
      {mode === 'create' && (
        <TemplateSelectionDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSelect={(selectedTemplate) => {
            setTitle(selectedTemplate.name);
            setDescription(selectedTemplate.description);
            setSections(selectedTemplate.fields);
          }}
        />
      )}

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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="edit">Edit Form</TabsTrigger>
          <TabsTrigger value="preview">Preview Form</TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sections</h2>
            <Button
              variant="outline"
              onClick={handleAddSection}
              className="flex items-center gap-2"
            >
              <LayoutTemplate className="h-4 w-4" />
              Add Section
            </Button>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="sections">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {sections.map((section, index) => (
                    <Draggable
                      key={section.id}
                      draggableId={section.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <FormField
                            field={section}
                            onUpdate={(updatedSection: FormFieldType) =>
                              handleUpdateSection(index, updatedSection)
                            }
                            onDelete={() => handleDeleteSection(index)}
                            totalSections={sections.length}
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
        </TabsContent>

        <TabsContent value="preview">
          <FormPreview
            title={title}
            description={description}
            fields={sections}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : mode === 'create' ? 'Create Form' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
} 