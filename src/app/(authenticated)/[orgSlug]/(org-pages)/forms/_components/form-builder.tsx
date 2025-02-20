'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle, LayoutTemplate, Send } from 'lucide-react';
import { FormField, type FormField as FormFieldType } from './form-field';
import { AddFieldDialog } from './add-field-dialog';
import { useToast } from '@/components/ui/use-toast';
import { createFormTemplate, updateFormTemplate } from '../_actions/form-template.action';
import { Database, Tables } from '@/lib/types/database.types';
import { TemplateSelectionDialog } from './template-selection-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormPreview } from './form-preview';
import { publishFormTemplate } from '../_actions/form-template.action';
import { Camelized } from 'humps';
import { Org } from '@/lib/types/org.type';
import { permissions } from '@/lib/types/permissions';
import { usePermissions } from '@/lib/hooks/use-permissions';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormBuilderProps {
  org: Camelized<Tables<"group">>;
  template?: FormTemplate;
  mode?: 'create' | 'edit';
  userPermissions: string[];
}

function ensureValidUUIDs(field: FormFieldType): FormFieldType {
  // Ensure the field itself has a valid UUID
  const updatedField = {
    ...field,
    id: field.id || crypto.randomUUID()
  };

  // Handle nested fields in sections
  if (field.type === 'section' && field.sectionConfig?.fields) {
    return {
      ...updatedField,
      sectionConfig: {
        ...field.sectionConfig,
        fields: field.sectionConfig.fields.map(ensureValidUUIDs)
      }
    };
  }

  // Handle nested fields in repeatable sections
  if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
    return {
      ...updatedField,
      repeatableConfig: {
        ...field.repeatableConfig,
        fields: field.repeatableConfig.fields.map(ensureValidUUIDs)
      }
    };
  }

  // Handle nested fields in groups
  if (field.type === 'group' && field.groupConfig?.fields) {
    return {
      ...updatedField,
      groupConfig: {
        ...field.groupConfig,
        fields: field.groupConfig.fields.map(ensureValidUUIDs)
      }
    };
  }

  return updatedField;
}

export function FormBuilder({ org, template, mode = 'create', userPermissions }: FormBuilderProps) {
  const orgId = org.id;
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [sections, setSections] = useState<FormFieldType[]>(() => {
    if (!template?.schema) return [createDefaultSection()];
    try {
      const schema = typeof template.schema === 'string' 
        ? JSON.parse(template.schema) 
        : template.schema;
      
      // Ensure fields arrays are initialized and have valid UUIDs
      const fields = schema.fields?.map((field: FormFieldType) => ensureValidUUIDs(field)) || [];

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
  const { hasPermission } = usePermissions(userPermissions);

  const canEdit = hasPermission(permissions.forms.edit);

  // If user can't edit, force preview tab
  useEffect(() => {
    if (!canEdit) {
      setActiveTab('preview');
    }
  }, [canEdit]);

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

  const handleSave = async (shouldPublish = false) => {
    if (!title) {
      toast({
        title: 'Error',
        description: 'Please enter a title for the form',
        variant: 'destructive',
      });
      return;
    }

    if (!sections.some(section => {
      const fields = section.sectionConfig?.fields;
      return Array.isArray(fields) && fields.length > 0;
    })) {
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
        status: shouldPublish ? 'published' : 'draft'
      };

      const result = mode === 'create'
        ? await createFormTemplate({ ...formData, orgId })
        : await updateFormTemplate(template!.id, formData);

      if (result.error) {
        throw new Error(result.error);
      }

      let publishResult = result.data?.id;
      if (shouldPublish) {
        publishResult = await publishFormTemplate(result.data.id);
      }

      if (publishResult.error) {
        throw new Error(publishResult.error);
      }

      toast({
        title: 'Success',
        description: `Form template ${shouldPublish ? 'published' : (mode === 'create' ? 'created' : 'updated')} successfully`,
      });

      router.push(`/@${org.slug}/forms`);
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

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSave(true);
  };

  return (
    <div className="space-y-6">
      {mode === 'create' && canEdit && (
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
            {canEdit ? (
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter form title"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-muted-foreground">{title}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            {canEdit ? (
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter form description"
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => canEdit && setActiveTab(value as 'edit' | 'preview')}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="edit" disabled={!canEdit}>Edit Form</TabsTrigger>
          <TabsTrigger value="preview">Preview Form</TabsTrigger>
        </TabsList>

        {canEdit && (
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
        )}

        <TabsContent value="preview">
          <FormPreview
            title={title}
            description={description}
            fields={sections}
          />
        </TabsContent>
      </Tabs>

      {canEdit && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="min-w-[100px]"
              onClick={(e) => {
                e.preventDefault();
                handleSave(false);
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            {mode === 'edit' && template?.status !== 'published' && hasPermission(permissions.forms.publish) && (
              <Button
                type="button"
                variant="outline"
                onClick={handlePublish}
                disabled={isSaving}
                className="min-w-[100px]"
              >
                Save & Publish
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 