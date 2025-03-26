'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PlusCircle, LayoutTemplate, Send, Edit, Eye, X, Save, Pencil, Check } from 'lucide-react';
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

// Add a small insert button component
const InsertSectionButton = ({ onClick }: { onClick: () => void }) => (
  <div className="flex justify-center h-0">
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="h-7 w-7 p-0 rounded-full bg-muted hover:bg-primary/20 hover:text-primary translate-y-[-50%] border-dashed border-primary/40 opacity-0 group-hover/section:opacity-60 hover:opacity-100 transition-all"
      title="Add section here"
    >
      <PlusCircle className="h-4 w-4" />
    </Button>
  </div>
);

export function FormBuilder({ org, template, mode = 'create', userPermissions }: FormBuilderProps) {
  const orgId = org.id;
  const sectionsContainerRef = useRef<HTMLDivElement>(null);
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
  const [editingHeader, setEditingHeader] = useState(mode === 'create');
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const { hasPermission } = usePermissions();

  // Check permission manually here instead of in the hook
  const hasPublishPermission = hasPermission(permissions.forms.publish);

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

  const scrollToBottom = () => {
    if (sectionsContainerRef.current) {
      const container = sectionsContainerRef.current;
      setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100); // Small delay to ensure the new section is rendered
    }
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
    scrollToBottom();
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

  const handleInsertSection = (index: number) => {
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
    
    const newSections = [...sections];
    newSections.splice(index, 0, newSection);
    setSections(newSections);
    
    // Scroll to the new section
    setTimeout(() => {
      const sectionElements = sectionsContainerRef.current?.querySelectorAll('[data-section-id]');
      if (sectionElements && sectionElements[index]) {
        sectionElements[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
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
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {editingHeader ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-base font-medium">Form Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter form title"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-base font-medium">Form Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter form description (optional)"
                    className="mt-1 min-h-[80px]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div 
                  className="text-xl font-semibold py-1 px-2 rounded hover:bg-muted/50 cursor-pointer flex items-center group/title"
                  onClick={() => setEditingHeader(true)}
                >
                  {title || "Untitled Form"}
                  <Pencil className="ml-2 h-4 w-4 text-primary/60 opacity-0 group-hover/title:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded" />
                </div>
                <div 
                  className="text-muted-foreground py-1 px-2 rounded hover:bg-muted/50 cursor-pointer flex items-start group/desc"
                  onClick={() => setEditingHeader(true)}
                >
                  <div className="flex-1 max-h-10 overflow-hidden">
                    {description ? description : <span className="italic text-muted-foreground/70">Add form description...</span>}
                  </div>
                  <Pencil className="ml-2 h-4 w-4 text-primary/60 opacity-0 group-hover/desc:opacity-100 transition-opacity bg-muted/30 p-0.5 rounded mt-1" />
                </div>
                {status === 'published' && (
                  <Badge className="bg-green-500 mt-2">Published</Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editingHeader ? (
              <Button
                variant="default"
                size="sm"
                onClick={() => setEditingHeader(false)}
              >
                <Check className="h-4 w-4 mr-1" />
                Save Settings
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingHeader(true)}
                className="flex items-center gap-1"
              >
                <LayoutTemplate className="h-4 w-4" />
                Form Settings
              </Button>
            )}
          </div>
        </div>
        
        <div>
          {editingHeader ? (
            null
          ) : (
            <div className="text-muted-foreground py-1 px-2 rounded hover:bg-muted/50 cursor-pointer group border border-transparent hover:border-muted/30"
              onClick={() => setEditingHeader(true)}
            >
              {description || "Add form description..."}
            </div>
          )}
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
                      ref={(el) => {
                        provided.innerRef(el);
                        // @ts-ignore - This is fine since we're combining refs
                        sectionsContainerRef.current = el;
                      }}
                      className="space-y-3"
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
                        <>
                          {/* Add a button to insert at the top */}
                          <div className="group/section mb-3">
                            <div className="h-3 hover:bg-muted/10 rounded-md transition-colors"></div>
                            <InsertSectionButton onClick={() => handleInsertSection(0)} />
                          </div>
                          
                          {sections.map((section, index) => (
                            <div key={section.id} className="space-y-0 mb-3 group/section">
                              <Draggable
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
                                    data-section-id={section.id}
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
                              
                              {/* Add insert button after each section */}
                              <InsertSectionButton onClick={() => handleInsertSection(index + 1)} />
                            </div>
                          ))}
                        </>
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