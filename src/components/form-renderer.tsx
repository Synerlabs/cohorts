'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database } from '@/lib/types/database.types';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';
import { uploadFileAction } from '@/app/actions/upload.action';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { Card } from '@/components/ui/card';
import { UploadProgressOverlay } from '@/components/ui/upload-progress';
import { createClient } from '@/lib/utils/supabase/client';
import { SignaturePad } from '@/components/ui/signature-pad';
import { useToast } from '@/components/ui/use-toast';

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
  sectionConfig?: {
    description?: string;
    fields?: FormField[];
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
  const supabase = createClient();
  const { toast } = useToast();
  
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
  const [pendingUploads, setPendingUploads] = useState<boolean>(false);
  const [formReadyToSubmit, setFormReadyToSubmit] = useState<boolean>(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<any>(null);
  
  // Define types for form response data
  type FormFieldData = {
    label: string;
    type: string;
    required: boolean;
    value: any;
  };

  type FormSectionData = {
    label: string;
    fields: Record<string, FormFieldData>;
  };

  type FormResponseData = {
    sections: Record<string, FormSectionData>;
    fields: Record<string, FormFieldData>;
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  // Add a ref to track which files have been processed
  const processedUploads = useRef<Record<string, boolean>>({});

  // Make updateFormDataWithUploads accept fields as a parameter to avoid dependency issues
  const updateFormDataWithUploads = (formData: any, uploadResults: Record<string, any>, fieldsData: FormField[]) => {
    if (!formData) return formData;
    
    const updatedFormData = {
      ...formData,
      responseData: {
        ...formData.responseData,
        fields: {
          ...formData.responseData.fields
        },
        sections: {
          ...formData.responseData.sections
        }
      }
    };

    // Update file fields in the response data
    Object.entries(uploadResults).forEach(([fieldId, fileInfo]) => {
      // Find field info from the provided fields array
      const field = fieldsData.find(f => f.id === fieldId) || 
        fieldsData.flatMap(f => 
          f.type === 'section' && f.sectionConfig?.fields 
            ? f.sectionConfig.fields 
            : []
        ).find(f => f.id === fieldId);

      if (field) {
        const sectionField = fieldsData.find(f => 
          f.type === 'section' && 
          f.sectionConfig?.fields?.some(sf => sf.id === fieldId)
        );

        if (sectionField) {
          if (updatedFormData.responseData.sections[sectionField.id]?.fields) {
            updatedFormData.responseData.sections[sectionField.id].fields[fieldId].value = fileInfo;
          }
        } else if (updatedFormData.responseData.fields[fieldId]) {
          updatedFormData.responseData.fields[fieldId].value = fileInfo;
        }
      }
    });
    
    return updatedFormData;
  };

  useEffect(() => {
    // When upload state changes and is successful, store the result
    if (uploadState && uploadState.success && uploadState.fileInfo) {
      const fileName = uploadState.fileInfo.name;
      const fieldId = Object.keys(fileFields).find(key => 
        fileFields[key].name === fileName
      );
      
      // Skip if we've already processed this file (prevents double processing)
      if (fieldId && !processedUploads.current[fileName]) {
        // Mark this file as processed
        processedUploads.current[fileName] = true;
        
        // Use a functional update to avoid dependency on current state
        setUploadResults(prev => {
          const newUploadResults = {
            ...prev,
            [fieldId]: uploadState.fileInfo
          };
          
          // Instead of calling these state updates separately, track if we need to submit
          let shouldSubmit = false;
          
          // Check if all files have been uploaded
          const uploadedCount = Object.keys(newUploadResults).length;
          const allUploadsComplete = Object.keys(fileFields).every(id => {
            return newUploadResults[id] || 
              (uploadState.fileInfo && fileFields[id].name === uploadState.fileInfo.name);
          });
          
          // Update other state in separate effects to avoid circular dependencies
          setTimeout(() => {
            setUploadedFiles(uploadedCount);
            setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
            
            // Only trigger form submission if all uploads are complete and we have data to submit
            if (allUploadsComplete && formDataToSubmit && !formReadyToSubmit) {
              // Create a local copy to avoid state dependency
              const dataToSubmit = { ...formDataToSubmit };
              
              // Clear formDataToSubmit first to avoid resubmission
              setFormDataToSubmit(null);
              setPendingUploads(false);
              setFormReadyToSubmit(true);
              
              // Update file fields in the response data - pass the current fields
              const updatedData = updateFormDataWithUploads(dataToSubmit, newUploadResults, fields);
              
              // Submit the form with a slight delay to ensure state updates complete
              setTimeout(() => {
                onSubmit(updatedData);
              }, 0);
            }
          }, 0);
          
          return newUploadResults;
        });
      }
    }
  // Explicitly listing the complete set of dependencies to prevent exhaustive-deps warnings
  }, [uploadState, fileFields, totalFiles, formDataToSubmit, formReadyToSubmit, fields, onSubmit]);
  
  // Reset form ready state after submission
  useEffect(() => {
    if (formReadyToSubmit) {
      setTimeout(() => {
        setFormReadyToSubmit(false);
      }, 100);
    }
  }, [formReadyToSubmit]);

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
    // Use a memoization check to avoid unnecessary state updates
    // Only update state if the value has actually changed
    if (value instanceof File) {
      // For files, we need special handling
      setFileFields(prev => {
        // If the value is the same, don't update state
        if (prev[fieldId] === value) return prev;
        return { ...prev, [fieldId]: value };
      });
    } else {
      // For all other values
      setFormData(prev => {
        // If the value is the same, don't update state
        if (prev[fieldId] === value) return prev;
        return { ...prev, [fieldId]: value };
      });
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
      // Create a deep copy of form data
      const submissionData = { ...formData };
      
      // Check if there are files to upload
      if (Object.keys(fileFields).length > 0) {
        console.log(`Preparing to upload ${Object.keys(fileFields).length} files`);
        
        // Set these values once at the beginning instead of updating during the loop
        const filesToUpload = Object.keys(fileFields).length;
        setTotalFiles(filesToUpload);
        setPendingUploads(true);
        setUploadedFiles(0);
        setUploadProgress(0);
        
        // Create a local object to track uploads instead of using state
        const localUploadResults: Record<string, any> = {};
        let localUploadedFiles = 0;
        
        try {
          // For a small number of files, upload them all and then submit directly
          for (const [fieldId, file] of Object.entries(fileFields)) {
            console.log(`Uploading file for field ${fieldId}:`, file.name);
            
            try {
              // Create upload form data with correct parameters
              const uploadFormData = new FormData();
              uploadFormData.append('file', file);
              uploadFormData.append('bucket', 'form-uploads');
              uploadFormData.append('folder', `form-responses/${formTemplateId}`);
              
              // Use the handleUpload function - cannot await this as it uses startTransition
              handleUpload(uploadFormData);
              
              // Wait for the upload to complete before continuing
              // We're going to rely on the uploadState changes in the useEffect instead
              // This will track progress via the uploadResults state
              
              // Mark this field as being processed to avoid duplicate uploads
              processedUploads.current[file.name] = false;
            } catch (error) {
              console.error(`Error initiating upload for field ${fieldId}:`, error);
              throw error;
            }
          }
          
          // Store the form data for submission after all uploads complete
          const formSubmitData = {
            templateId: formTemplateId,
            responseData: processFormResponse(submissionData)
          };
          
          // Set this to trigger the useEffect to submit the form when uploads are done
          setFormDataToSubmit(formSubmitData);
          
          // Note: The actual form submission will happen in the useEffect that monitors uploadResults
        } catch (error) {
          console.error('Error during file uploads:', error);
          toast({
            title: 'Upload Failed',
            description: error instanceof Error ? error.message : 'Failed to upload files',
            variant: 'destructive',
          });
          setPendingUploads(false);
        }
      } else {
        // No files to upload, submit form directly with data including signatures
        console.log('No files to upload, submitting form directly');
        const formSubmitData = {
          templateId: formTemplateId,
          responseData: processFormResponse(submissionData)
        };
        onSubmit(formSubmitData);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      if (!pendingUploads) {
        setSubmitting(false);
      }
    }
  };

  // Helper function to process form data into response format
  const processFormResponse = (formData: Record<string, any>): FormResponseData => {
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
          extractFields(field.groupConfig.fields, parentSection);
        } else if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
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

    // Prepare the response data
    const responseData: FormResponseData = {
      sections: {},
      fields: {}
    };

    // Process each field
    Object.entries(fieldInfo).forEach(([fieldId, field]) => {
      const value = formData[fieldId];
      const fieldData = {
        label: field.label,
        type: field.type,
        required: field.required,
        value: value
      };

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

    return responseData;
  };

  // Create a more stable component for signature field
  const SignatureField = ({ 
    fieldId, 
    fieldLabel, 
    fieldRequired, 
    fieldHelpText, 
    fieldValue,
  }: { 
    fieldId: string;
    fieldLabel: string;
    fieldRequired: boolean;
    fieldHelpText?: string;
    fieldValue: any;
  }) => {
    // Track when we've received the first signature value
    const isInitialized = useRef(false);
    // Use a ref to store the current field ID to avoid stale closures
    const fieldIdRef = useRef(fieldId);
    
    // Only update the fieldIdRef when it changes
    useEffect(() => {
      fieldIdRef.current = fieldId;
    }, [fieldId]);
    
    // Create a dedicated state for the signature that doesn't reset on re-renders
    const [internalSignature, setInternalSignature] = useState<string | null>(null);
    
    // Initialize the signature value from props just once
    useEffect(() => {
      // If we haven't initialized yet and fieldValue exists, set it
      if (!isInitialized.current && fieldValue) {
        console.log('Initializing signature with value');
        setInternalSignature(fieldValue);
        isInitialized.current = true;
      }
    }, [fieldValue]);
    
    // Define a stable callback that won't cause re-renders
    const handleSignatureChange = useCallback((dataUrl: string | null) => {
      console.log('Signature changed:', dataUrl ? 'data present' : 'no data');
      
      // Update our internal state
      setInternalSignature(dataUrl);
      
      // Then update the form data, using the ref to avoid stale closures
      if (dataUrl !== undefined) {
        // Use setTimeout to break potential circular updates
        setTimeout(() => {
          handleFieldChange(fieldIdRef.current, dataUrl);
        }, 0);
      }
    }, []);
    
    // Determine which value to use - prefer our internal state if it exists
    const displaySignature = internalSignature !== null ? internalSignature : fieldValue;
    
    return (
      <div className="space-y-2">
        <Label htmlFor={fieldId}>
          {fieldLabel}
          {fieldRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
        
        <SignaturePad
          key={`sig-${fieldId}`}
          initialSignature={displaySignature}
          onSignatureChange={handleSignatureChange}
        />
        {fieldHelpText && (
          <p className="text-sm text-muted-foreground mt-1">{fieldHelpText}</p>
        )}
      </div>
    );
  };

  const renderField = (field: any) => {
    // Memoize field objects to prevent unnecessary rerenders
    const fieldId = field.id;
    const fieldType = field.type;
    const fieldLabel = field.label;
    const fieldRequired = field.required;
    const fieldHelpText = field.help_text;
    const fieldPlaceholder = field.placeholder;
    
    // Get form data value with a default to prevent undefined
    const fieldValue = formData[fieldId] !== undefined ? formData[fieldId] : '';

    switch (fieldType) {
      case 'text':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Input
              id={fieldId}
              type="text"
              placeholder={fieldPlaceholder || field.textConfig?.placeholder || 'Enter text'}
              required={fieldRequired}
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Textarea
              id={fieldId}
              placeholder={fieldPlaceholder || field.textConfig?.placeholder || 'Enter text'}
              required={fieldRequired}
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Input
              id={fieldId}
              type="email"
              placeholder={fieldPlaceholder || field.emailConfig?.placeholder || 'Enter email'}
              required={fieldRequired}
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Input
              id={fieldId}
              type="tel"
              placeholder={fieldPlaceholder || field.phoneConfig?.placeholder || 'Enter phone number'}
              required={fieldRequired}
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Input
              id={fieldId}
              type="date"
              required={fieldRequired}
              value={fieldValue}
              onChange={(e) => handleFieldChange(fieldId, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <Select
              value={fieldValue}
              onValueChange={(value) => handleFieldChange(fieldId, value)}
              required={fieldRequired}
            >
              <SelectTrigger>
                <SelectValue placeholder={fieldPlaceholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: any) => {
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
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={fieldId}
                checked={fieldValue || false}
                onCheckedChange={(checked) => handleFieldChange(fieldId, checked)}
                required={fieldRequired}
              />
              <Label htmlFor={fieldId}>
                {fieldLabel}
                {fieldRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            <Label>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <RadioGroup
              value={fieldValue}
              onValueChange={(value) => handleFieldChange(fieldId, value)}
              required={fieldRequired}
            >
              {field.options?.map((option: any) => {
                const value = typeof option === 'object' ? option.value : option;
                const label = typeof option === 'object' ? option.label : option;
                return (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`${fieldId}-${value}`} />
                    <Label htmlFor={`${fieldId}-${value}`}>{label}</Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );

      case 'signature':
        return (
          <SignatureField
            fieldId={fieldId}
            fieldLabel={fieldLabel}
            fieldRequired={fieldRequired}
            fieldHelpText={fieldHelpText}
            fieldValue={fieldValue}
          />
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Label htmlFor={fieldId}>
              {fieldLabel}
              {fieldRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            
            <FileUpload
              id={fieldId}
              accept={field.fileConfig?.accept}
              maxSize={field.fileConfig?.maxSize}
              value={fileFields[fieldId] ? { 
                name: fileFields[fieldId].name,
                size: fileFields[fieldId].size,
                type: fileFields[fieldId].type,
                path: '',
                url: URL.createObjectURL(fileFields[fieldId])
              } : undefined}
              onUpload={(file: File) => handleFieldChange(fieldId, file)}
              onError={(error: string) => console.error('File validation error:', error)}
              onRemove={() => {
                const newFileFields = { ...fileFields };
                delete newFileFields[fieldId];
                setFileFields(newFileFields);
              }}
            />
          </div>
        );

      case 'section':
        return (
          <div className={cn("space-y-8 transition-opacity", {
            "animate-in fade-in": true,
          })}>
            {fieldLabel && (
              <h3 className="font-medium text-xl -mb-8">{fieldLabel}</h3>
            )}
            {field.sectionConfig?.description && (
              <p className="text-sm text-muted-foreground">{field.sectionConfig.description}</p>
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

      case 'group':
        return (
          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-lg">{fieldLabel}</h3>
                {field.groupConfig?.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {field.groupConfig.description}
                  </p>
                )}
              </div>
              <div className="space-y-6">
                {field.groupConfig?.fields?.map((subfield: any) => (
                  <div key={subfield.id}>
                    {renderField(subfield)}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );

      case 'repeatable':
        return (
          <div className="space-y-4">
            {(fieldValue || [{}]).map((item: any, index: number) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-end">
                    {(fieldValue?.length || 0) > (field.repeatableConfig?.minItems || 1) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newItems = [...(fieldValue || [])];
                          newItems.splice(index, 1);
                          handleFieldChange(fieldId, newItems);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {field.repeatableConfig?.fields.map((subfield: any) => {
                      const subfieldId = `${fieldId}.${index}.${subfield.id}`;
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
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentItems = fieldValue || [];
                if (field.repeatableConfig?.maxItems && currentItems.length >= field.repeatableConfig.maxItems) {
                  return;
                }
                const newItem = field.repeatableConfig?.fields.reduce((acc: any, subfield: any) => {
                  acc[subfield.id] = '';
                  return acc;
                }, {});
                handleFieldChange(fieldId, [...currentItems, newItem]);
              }}
              disabled={
                field.repeatableConfig?.maxItems 
                  ? (fieldValue?.length || 0) >= field.repeatableConfig.maxItems 
                  : false
              }
            >
              {field.repeatableConfig?.addLabel || 'Add Item'}
            </Button>
          </div>
        );

      default:
        return null;
    }
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
    <div className="relative min-h-full">
      <UploadProgressOverlay 
        isUploading={pendingUploads} 
        progress={uploadProgress}
        totalFiles={totalFiles}
        uploadedFiles={uploadedFiles}
      />
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
            disabled={submitting || isUploading || pendingUploads}
          >
            {submitting || isUploading || pendingUploads ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploading || pendingUploads ? 'Uploading...' : 'Submitting...'}
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
    </div>
  );
} 