'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle, LayoutTemplate, Send, Edit, Eye, X, Save } from 'lucide-react';
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
import { ClientComponentPermission } from '@/components/ClientComponentPermission';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const [status, setStatus] = useState<'draft' | 'published'>((template?.status === 'published' ? 'published' : 'draft'));
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
  const { hasPermission } = usePermissions();

  // Check permission manually here instead of in the hook
  const hasPublishPermission = userPermissions.includes(permissions.forms.publish);

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

  const handleSave = async (shouldPublish: boolean = false) => {
    if (!title.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a form title',
        variant: 'destructive',
      });
      return;
    }

    if (!sections.some(section => section.sectionConfig?.fields && section.sectionConfig.fields.length > 0)) {
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
        setStatus('published');
      } else {
        setStatus('draft');
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

      <div className="p-6 border rounded-lg border-l-4 border-l-primary bg-card space-y-4">
        <div>
          <Label htmlFor="title" className="text-base font-medium">Form Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter form title"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="description" className="text-base font-medium">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter form description"
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>

      <Tabs 
        defaultValue={activeTab} 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'edit' | 'preview')}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="edit" className="text-base">
            <span className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit Form
            </span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-base">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Form
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="border rounded-lg overflow-hidden bg-card">
          <TabsContent value="edit" className="m-0">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5 text-muted-foreground" />
                  Form Sections
                </h2>
                <Button
                  variant="outline"
                  onClick={handleAddSection}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Section
                </Button>
              </div>

              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="sections">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-6"
                    >
                      {sections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-md bg-muted/40">
                          <LayoutTemplate className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No sections yet. Add your first section to get started.</p>
                          <Button 
                            variant="outline" 
                            className="mt-4" 
                            onClick={handleAddSection}
                          >
                            Add Section
                          </Button>
                        </div>
                      ) : (
                        sections.map((section, index) => (
                          <Draggable
                            key={section.id}
                            draggableId={section.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={cn(
                                  "transition-all",
                                  snapshot.isDragging ? "opacity-70 scale-[1.02] shadow-md" : ""
                                )}
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
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="m-0">
            <div className="p-6 border-t">
              <FormPreview
                title={title}
                description={description}
                fields={sections}
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="p-4 flex items-center justify-between gap-3 border rounded-lg bg-muted/30">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={status === 'published' ? "default" : "secondary"} className={cn(status === 'published' ? "bg-green-500" : "")}>
            {status === 'published' ? "Published" : "Draft"}
          </Badge>
          {status === 'published' && (
            <span className="text-xs text-muted-foreground">
              {template?.updated_at ? `Last updated: ${new Date(template.updated_at).toLocaleDateString()}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          {hasPublishPermission && (
            <Button 
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSaving ? 'Publishing...' : 'Save & Publish'}
            </Button>
          )}
          <Button 
            onClick={() => handleSave(false)} 
            disabled={isSaving}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving 
              ? 'Saving...' 
              : mode === 'create' 
                ? 'Save as Draft'
                : status === 'published' 
                  ? 'Save Changes' 
                  : 'Update Draft'}
          </Button>
        </div>
      </div>
    </div>
  );
} 