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

// Add state for insert position
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
  const [insertSectionPosition, setInsertSectionPosition] = useState<number | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const { hasPermission } = usePermissions();

  // Check permission manually here instead of in the hook
  const hasPublishPermission = hasPermission(permissions.forms.publish);

  // Track the original section IDs to identify new vs. existing sections
  const [originalSectionIds, setOriginalSectionIds] = useState<Set<string>>(() => {
    if (!template?.schema) return new Set();
    try {
      const schema = typeof template.schema === 'string' 
        ? JSON.parse(template.schema) 
        : template.schema;
      
      return new Set((schema.fields || []).map((field: FormFieldType) => field.id));
    } catch (error) {
      return new Set();
    }
  });
  
  // Track modified sections
  const [modifiedSectionIds, setModifiedSectionIds] = useState<Set<string>>(new Set());

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
    
    // Mark this section as modified
    if (originalSectionIds.has(section.id)) {
      setModifiedSectionIds(prev => new Set(prev).add(section.id));
    }
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
    
    // If we're down to one section, make sure it has a proper label
    if (newSections.length === 1 && (!newSections[0].label || newSections[0].label === '')) {
      newSections[0] = {
        ...newSections[0],
        label: 'Default Section',
      };
    }
    
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

  // Update the InsertSectionButton to use the insert position
  const InsertSectionButton = ({ onClick, position }: { onClick?: () => void, position: number }) => (
    <div className="flex justify-center h-0">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleInsertSection(position)}
        className="h-7 w-7 p-0 rounded-full bg-muted hover:bg-primary/20 hover:text-primary translate-y-[-50%] border-dashed border-primary/40 opacity-0 group-hover/section:opacity-60 hover:opacity-100 transition-all"
        title="Add section here"
      >
        <PlusCircle className="h-4 w-4" />
      </Button>
    </div>
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'edit' | 'preview');
    
    // Ensure we have at least one section
    if (sections.length === 0) {
      setSections([createDefaultSection()]);
    } else if (sections.length === 1 && (!sections[0].label || sections[0].label === '')) {
      // If we have a section but it's blank (might happen after add/remove operations), fix it
      const updatedSection = {
        ...sections[0],
        label: 'Default Section'
      };
      setSections([updatedSection]);
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

      <div className="rounded-lg border bg-card shadow-sm mb-8">
        {editingHeader ? (
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-medium mb-2 flex items-center gap-2 text-primary">
              <Edit className="h-5 w-5" />
              Form Settings
            </h2>
            
            <div className="grid gap-5">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">Form Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter form title"
                  className="mt-1.5"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium">Form Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter form description (optional)"
                  className="mt-1.5 min-h-[100px] resize-y"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="default"
                  onClick={() => setEditingHeader(false)}
                  className="gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  Apply Changes
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/5 transition-colors group cursor-pointer"
            onClick={() => setEditingHeader(true)}
          >
            <div className="space-y-2 max-w-2xl">
              
              <div className="space-y-1">
                <div className="font-medium">{title || "Untitled Form"}</div>
                
                {description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
                ) : (
                  <p className="text-sm text-muted-foreground/70 italic">Add a description for this form...</p>
                )}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="self-start md:self-center"
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit Details
            </Button>
          </div>
        )}
      </div>

      <Tabs 
        defaultValue={activeTab} 
        value={activeTab} 
        onValueChange={handleTabChange}
        className="mb-10"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary/70" />
            Form Builder
          </h2>
          <TabsList className="bg-muted/50 p-1 rounded-lg">
            <TabsTrigger value="edit" className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <div>
          <TabsContent value="edit" className="m-0 p-0">
            <div className="space-y-6">
              {sections.length > 1 ? (
                <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <LayoutTemplate className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">Form Sections</h3>
                      <p className="text-xs text-muted-foreground">{sections.length} sections in this form</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-card border border-primary/20"></div>
                        <span>Saved</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-amber-50 border border-amber-300"></div>
                        <span>Modified</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-blue-50 border border-blue-300"></div>
                        <span>New</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleAddSection}
                      className="gap-1.5"
                      size="sm"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Add Section
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end mb-4">
                  <Button
                    variant="outline"
                    onClick={handleAddSection}
                    className="gap-1.5"
                    size="sm"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Add Section
                  </Button>
                </div>
              )}

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
                          <div className="group/section">
                            <div className="h-3 hover:bg-muted/10 rounded-md transition-colors"></div>
                            <InsertSectionButton position={0} />
                          </div>
                          
                          {sections.map((section, index) => (
                            <div key={section.id} className="space-y-0 group/section">
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
                                    <div className={cn(
                                      "rounded-md px-5 py-6 border-l-4 transition-colors",
                                      // New section (not in original)
                                      !originalSectionIds.has(section.id) 
                                        ? "bg-blue-50/50 border-l-blue-300 hover:border-l-blue-500 shadow-sm" 
                                        // Modified section (in original but changed)
                                        : modifiedSectionIds.has(section.id)
                                          ? "bg-amber-50/50 border-l-amber-300 hover:border-l-amber-500 shadow-sm"
                                          // Saved/unchanged section
                                          : "bg-white border-l-primary/20 hover:border-l-primary/40 shadow-sm"
                                    )}>
                                      <FormField
                                        field={section}
                                        onUpdate={(updatedSection: FormFieldType) =>
                                          handleUpdateSection(index, updatedSection)
                                        }
                                        onDelete={() => handleDeleteSection(index)}
                                        totalSections={sections.length}
                                      />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                              
                              {/* Add insert button after each section */}
                              <InsertSectionButton position={index + 1} />
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
            <div className="rounded-lg border shadow-sm bg-white overflow-hidden">
              <div className="p-3 bg-muted/40 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-xs text-muted-foreground">Form Preview</div>
                </div>
                <Badge variant="outline" className="h-5 px-2 text-xs bg-muted/50 hover:bg-muted">
                  <Eye className="h-3 w-3 mr-1" />
                  Preview Mode
                </Badge>
              </div>
              <div className="p-6">
                <FormPreview
                  title={title}
                  description={description}
                  fields={sections}
                />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <div className="sticky bottom-0 pt-6 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-card/95 backdrop-blur-sm p-5 shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Status</span>
                <Badge 
                  variant={status === 'published' ? "default" : "secondary"} 
                  className={cn(
                    "rounded-full px-3", 
                    status === 'published' 
                      ? "bg-green-500 hover:bg-green-600" 
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  )}
                >
                  {status === 'published' ? "Published" : "Draft"}
                </Badge>
              </div>
              
              {status === 'published' && template?.updated_at && (
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(template.updated_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <Button 
              variant="outline" 
              onClick={() => router.back()} 
              className="gap-2 min-w-20"
              size="sm"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
            
            {hasPublishPermission && status !== 'published' && (
              <Button 
                variant="outline"
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="gap-2 min-w-32 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 hover:border-green-300"
                size="sm"
              >
                <Send className="h-3.5 w-3.5" />
                {isSaving ? 'Publishing...' : 'Publish'}
              </Button>
            )}
            
            <Button 
              onClick={() => handleSave(false)} 
              disabled={isSaving}
              className="gap-2 min-w-32"
              size="sm"
            >
              <Save className="h-3.5 w-3.5" />
              {isSaving 
                ? 'Saving...' 
                : status === 'published' 
                  ? 'Save Changes' 
                  : 'Save as Draft'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 