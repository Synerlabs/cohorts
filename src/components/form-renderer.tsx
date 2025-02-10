'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/types/database.types';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';
import { uploadFileAction } from '@/app/actions/upload.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  help_text?: string;
  placeholder?: string;
  options?: string[];
  fileConfig?: {
    accept?: string;
    maxSize?: number;
    maxFiles?: number;
    file?: File;
  };
  textConfig?: {
    placeholder?: string;
    minLength?: number;
    maxLength?: number;
  };
  numberConfig?: {
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
  };
  emailConfig?: {
    placeholder?: string;
    allowedDomains?: string[];
  };
  phoneConfig?: {
    placeholder?: string;
    format?: string;
  };
  choiceConfig?: {
    layout?: 'vertical' | 'horizontal';
    allowOther?: boolean;
  };
  groupConfig?: {
    description?: string;
    fields?: FormField[];
  };
  dateConfig?: {
    placeholder?: string;
  };
  repeatableConfig?: {
    itemLabel?: string;
    addLabel?: string;
    maxItems?: number;
    fields: FormField[];
  };
}

interface FormRendererProps {
  formTemplateId: string;
  formTemplate?: FormTemplate;
  onSubmit: (formData: any) => void;
  submitButtonText?: string;
}

export function FormRenderer({ formTemplateId, formTemplate: initialTemplate, onSubmit, submitButtonText = 'Submit' }: FormRendererProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(initialTemplate || null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(!initialTemplate);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileFields, setFileFields] = useState<Record<string, File>>({});
  const supabase = createClientComponentClient<Database>();
  
  type UploadActionResult = {
    success: boolean;
    error?: string;
    fileInfo?: {
      path: string;
      url: string;
      name: string;
      size: number;
      type: string;
    };
  };

  const [uploadState, handleUpload, isUploading] = useToastActionState(uploadFileAction);

  // Track upload completion
  const [uploadResults, setUploadResults] = useState<Record<string, any>>({});
  
  useEffect(() => {
    // When upload state changes and is successful, store the result
    if (uploadState?.success && uploadState.fileInfo) {
      const fieldId = Object.keys(fileFields).find(key => 
        fileFields[key].name === uploadState.fileInfo?.name
      );
      
      if (fieldId) {
        setUploadResults(prev => ({
          ...prev,
          [fieldId]: uploadState.fileInfo
        }));
        // Also store in formData to ensure it's included in the response
        setFormData(prev => ({
          ...prev,
          [fieldId]: uploadState.fileInfo
        }));
      }
    }
  }, [uploadState, fileFields]);

  useEffect(() => {
    async function loadFormTemplate() {
      if (initialTemplate) {
        setTemplate(initialTemplate);
        parseSchema(initialTemplate.schema);
        setLoading(false);
        return;
      }

      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .select('*')
        .eq('id', formTemplateId)
        .single();

      if (templateError) {
        console.error('Error loading form template:', formTemplateId, templateError);
        return;
      }

      setTemplate(template);
      parseSchema(template.schema);
      setLoading(false);
    }

    loadFormTemplate();
  }, [formTemplateId, initialTemplate, supabase]);

  const parseSchema = (schema: any) => {
    try {
      const parsedSchema = typeof schema === 'string' 
        ? JSON.parse(schema) 
        : schema;
      
      // Helper function to process group fields with default subfields
      const processGroupField = (field: any) => {
        if (field.type === 'group') {
          return {
            ...field,
            groupConfig: field.groupConfig || { fields: [] }
          };
        }
        return field;
      };

      // Process all fields recursively
      const processFields = (fields: any[]): any[] => {
        return fields.map(field => {
          // Process the current field if it's a group
          field = processGroupField(field);
          
          // Process fields in sections
          if (field.type === 'section' && field.sectionConfig?.fields) {
            field.sectionConfig.fields = processFields(field.sectionConfig.fields);
          }
          
          // Process fields in repeatable
          if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
            field.repeatableConfig.fields = processFields(field.repeatableConfig.fields);
          }
          
          return {
            ...field,
            id: field.id,
            type: field.type?.toLowerCase(),
            label: field.label,
            required: field.required,
            help_text: field.help_text || field.helpText, // Support both formats
            placeholder: field.placeholder,
            options: field.options,
            sectionConfig: field.sectionConfig,
            fileConfig: field.fileConfig,
            textConfig: field.textConfig,
            numberConfig: field.numberConfig,
            emailConfig: field.emailConfig,
            phoneConfig: field.phoneConfig,
            choiceConfig: field.choiceConfig,
            groupConfig: field.groupConfig,
            dateConfig: field.dateConfig,
            repeatableConfig: field.repeatableConfig,
          };
        });
      };

      const fields = parsedSchema.fields ? processFields(parsedSchema.fields) : [];
      console.log('Parsed fields with full config:', fields);
      setFields(fields);
    } catch (error) {
      console.error('Error parsing form schema:', error);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    if (value instanceof File) {
      setFileFields(prev => ({
        ...prev,
        [fieldId]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldId]: value
      }));
    }
  };

  // Get sections from fields
  const sections = fields.filter(field => field.type === 'section');
  const isLastStep = currentStep === sections.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (currentStep < sections.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLastStep) {
      handleNext();
      return;
    }

    setSubmitting(true);
    try {
      // Get field information from template
      type FieldInfo = {
        label: string;
        type: string;
        required: boolean;
        section?: {
          id: string;
          label: string;
        };
      };

      const fieldInfo: Record<string, FieldInfo> = {};
      const sectionMap: Record<string, { 
        id: string;
        label: string;
        fields: string[];
      }> = {};

      const extractFields = (fields: any[], parentSection?: { id: string; label: string }) => {
        fields.forEach(field => {
          if (field.type === 'section' && field.sectionConfig?.fields) {
            const sectionInfo = {
              id: field.id,
              label: field.label,
              fields: []
            };
            sectionMap[field.id] = sectionInfo;
            extractFields(field.sectionConfig.fields, { id: field.id, label: field.label });
          } else if (field.type === 'group' && field.groupConfig?.fields) {
            // Handle group fields
            extractFields(field.groupConfig.fields, parentSection);
          } else if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
            // Handle repeatable fields
            const items = formData[field.id] || [];
            items.forEach((item: any, index: number) => {
              field.repeatableConfig.fields.forEach((subfield: any) => {
                const subfieldId = `${field.id}.${index}.${subfield.id}`;
                fieldInfo[subfieldId] = {
                  label: `${field.label} #${index + 1} - ${subfield.label}`,
                  type: subfield.type,
                  required: subfield.required,
                  section: parentSection
                };
                if (parentSection) {
                  sectionMap[parentSection.id].fields.push(subfieldId);
                }
              });
            });
          } else {
            fieldInfo[field.id] = {
              label: field.label,
              type: field.type,
              required: field.required,
              section: parentSection
            };
            if (parentSection) {
              sectionMap[parentSection.id].fields.push(field.id);
            }
          }
        });
      };
      
      if (template?.schema) {
        const schema = typeof template.schema === 'string' 
          ? JSON.parse(template.schema) 
          : template.schema;
        
        if (schema.fields) {
          extractFields(schema.fields);
        }
      }

      // Upload all files sequentially and store their information
      for (const [fieldId, file] of Object.entries(fileFields)) {
        console.log(`Uploading file for field ${fieldId}`);
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await handleUpload(formData);
        
        // Wait for the upload state to be updated
        await new Promise<void>((resolve, reject) => {
          let attempts = 0;
          const maxAttempts = 50;
          
          const checkState = () => {
            attempts++;
            if (uploadState?.error) {
              console.error("Upload error:", uploadState.error);
              reject(new Error(uploadState.error));
            } else if (uploadState?.success && uploadState.fileInfo) {
              console.log("Upload successful:", uploadState.fileInfo);
              // Store file info in both states
              setUploadResults(prev => ({
                ...prev,
                [fieldId]: uploadState.fileInfo
              }));
              setFormData(prev => ({
                ...prev,
                [fieldId]: uploadState.fileInfo
              }));
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('Upload timeout'));
            } else {
              setTimeout(checkState, 100);
            }
          };
          checkState();
        });
      }

      // Prepare the response data with hierarchical structure
      const responseData: {
        sections: Record<string, {
          label: string;
          fields: Record<string, {
            label: string;
            type: string;
            required: boolean;
            value: any;
          }>;
        }>;
        fields: Record<string, {
          label: string;
          type: string;
          required: boolean;
          value: any;
        }>;
      } = {
        sections: {},
        fields: {}
      };

      // Process each field
      Object.entries(fieldInfo).forEach(([fieldId, field]) => {
        const value = field.type === 'file' ? formData[fieldId] || uploadResults[fieldId] : formData[fieldId];
        const fieldData = {
          label: field.label,
          type: field.type,
          required: field.required,
          value: value
        };

        // Add to appropriate section or root fields
        if (field.section) {
          if (!responseData.sections[field.section.id]) {
            responseData.sections[field.section.id] = {
              label: field.section.label,
              fields: {}
            };
          }
          responseData.sections[field.section.id].fields[fieldId] = fieldData;
        } else {
          responseData.fields[fieldId] = fieldData;
        }
      });

      // Pass the response data to parent for storing in form_responses table
      await onSubmit({
        templateId: formTemplateId,
        responseData
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      console.log("Form submission cleanup");
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'section') {
      return (
        <div className={cn("space-y-4 transition-opacity", {
          "animate-in fade-in": true,
        })}>
          {field.label && (
            <h3 className="font-medium text-lg">{field.label}</h3>
          )}
          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
          <div className="space-y-6">
            {field.sectionConfig?.fields?.map((subfield: any) => (
              <div key={subfield.id}>
                {renderField(subfield)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'group') {
      return (
        <div className="space-y-4">
          {field.groupConfig?.description && (
            <p className="text-sm text-muted-foreground">
              {field.groupConfig.description}
            </p>
          )}
          <div className="space-y-6 pl-4 border-l-2">
            {field.groupConfig?.fields?.map((subfield: FormField) => (
              <div key={subfield.id}>
                {renderField(subfield)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'date') {
      return (
        <div className="space-y-2">
          <Label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          <Input
            id={field.id}
            type="date"
            placeholder={field.placeholder || field.dateConfig?.placeholder || 'Select date'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />

          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
        </div>
      );
    }

    if (field.type === 'group' && field.groupConfig?.fields) {
      return (
        <div className="space-y-4">
          {field.groupConfig.description && (
            <p className="text-sm text-muted-foreground">
              {field.groupConfig.description}
            </p>
          )}
          <div className="space-y-6 pl-4 border-l-2">
            {field.groupConfig.fields.map((subfield: FormField) => (
              <div key={subfield.id}>
                {renderField(subfield)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
      // Initialize repeatable field with one item if empty
      if (!formData[field.id]) {
        const initialItem = field.repeatableConfig.fields.reduce((acc: any, subfield: FormField) => {
          acc[subfield.id] = '';
          return acc;
        }, {});
        handleFieldChange(field.id, [initialItem]);
      }

      return (
        <div className="space-y-4">
          {formData[field.id]?.map((item: any, index: number) => (
            <div key={`${field.id}-${index}`} className="space-y-4 border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">
                  {field.repeatableConfig.itemLabel || `Item ${index + 1}`}
                </h4>
                {(formData[field.id]?.length || 0) > (field.repeatableConfig.minItems || 1) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newItems = [...(formData[field.id] || [])];
                      newItems.splice(index, 1);
                      handleFieldChange(field.id, newItems);
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                {field.repeatableConfig.fields.map((subfield: FormField) => {
                  const subfieldId = `${field.id}.${index}.${subfield.id}`;
                  return (
                    <div key={subfieldId}>
                      {renderField({
                        ...subfield,
                        id: subfieldId,
                        value: item[subfield.id],
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const currentItems = formData[field.id] || [];
              if (field.repeatableConfig.maxItems && currentItems.length >= field.repeatableConfig.maxItems) {
                return;
              }
              const newItem = field.repeatableConfig.fields.reduce((acc: any, subfield: FormField) => {
                acc[subfield.id] = '';
                return acc;
              }, {});
              handleFieldChange(field.id, [...currentItems, newItem]);
            }}
            disabled={
              field.repeatableConfig.maxItems 
                ? (formData[field.id]?.length || 0) >= field.repeatableConfig.maxItems 
                : false
            }
          >
            {field.repeatableConfig.addLabel || 'Add Item'}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={field.id}>
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        {field.type === 'text' && (
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder || field.textConfig?.placeholder || 'Enter text'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'textarea' && (
          <Textarea
            id={field.id}
            placeholder={field.placeholder || field.textConfig?.placeholder || 'Enter text'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'number' && (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder || field.numberConfig?.placeholder || 'Enter number'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'checkbox' && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={formData[field.id] || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
              required={field.required}
            />
            <label
              htmlFor={field.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.placeholder || field.label}
            </label>
          </div>
        )}

        {field.type === 'radio' && field.options && (
          <RadioGroup
            onValueChange={(value) => handleFieldChange(field.id, value)}
            value={formData[field.id] || ''}
            required={field.required}
          >
            {field.options.map((option: any) => {
              const value = typeof option === 'object' ? option.value : option;
              const label = typeof option === 'object' ? option.label : option;
              return (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`${field.id}-${value}`} />
                  <Label htmlFor={`${field.id}-${value}`}>{label}</Label>
                </div>
              );
            })}
          </RadioGroup>
        )}

        {field.type === 'select' && field.options && (
          <Select
            value={formData[field.id] || ''}
            onValueChange={(value) => handleFieldChange(field.id, value)}
            required={field.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option: any) => {
                const value = typeof option === 'object' ? option.value : option;
                const label = typeof option === 'object' ? option.label : option;
                return (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        {field.type === 'email' && (
          <Input
            id={field.id}
            type="email"
            placeholder={field.placeholder || field.emailConfig?.placeholder || 'Enter email'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'phone' && (
          <Input
            id={field.id}
            type="tel"
            placeholder={field.placeholder || field.phoneConfig?.placeholder || 'Enter phone number'}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}

        {field.type === 'file' && (
          <FileUpload
            id={field.id}
            accept={field.fileConfig?.accept}
            maxSize={field.fileConfig?.maxSize}
            value={fileFields[field.id] ? { 
              name: fileFields[field.id].name,
              size: fileFields[field.id].size,
              type: fileFields[field.id].type,
              path: '',
              url: URL.createObjectURL(fileFields[field.id])
            } : undefined}
            onUpload={(file: File) => handleFieldChange(field.id, file)}
            onError={(error: string) => console.error('File validation error:', error)}
            onRemove={() => {
              const newFileFields = { ...fileFields };
              delete newFileFields[field.id];
              setFileFields(newFileFields);
            }}
          />
        )}

        {field.help_text && (
          <p className="text-sm text-muted-foreground">{field.help_text}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!template || !fields.length) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Form template not found or has no fields.
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No form sections found.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Step {currentStep + 1} of {sections.length}</p>
          <p className="text-sm text-muted-foreground">{sections[currentStep].label}</p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / sections.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current section */}
      {renderField(sections[currentStep])}

      {/* Navigation buttons */}
      <div className="flex gap-4 pt-4">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            className="flex-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
        )}
        <Button
          type="submit"
          className="flex-1"
          disabled={submitting || isUploading}
        >
          {submitting || isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploading ? 'Uploading...' : 'Submitting...'}
            </>
          ) : isLastStep ? (
            submitButtonText
          ) : (
            <>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
} 