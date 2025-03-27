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
  onSubmit: (formData: any) => Promise<any> | any;
  submitButtonText?: string;
  initialResponseData?: any;
}

export function FormRenderer({ 
  formTemplateId, 
  formTemplate: initialTemplate, 
  onSubmit, 
  submitButtonText = 'Submit',
  initialResponseData 
}: FormRendererProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(initialTemplate || null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(!initialTemplate);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fileFields, setFileFields] = useState<Record<string, File>>({});
  const [totalSteps, setTotalSteps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
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
    console.log('updateFormDataWithUploads called with:', { 
      formData: formData,
      uploadResults: Object.keys(uploadResults),
      fieldsCount: fieldsData.length
    });
    
    if (!formData) return formData;
    
    // Use the correct path for form data
    const updatedFormData = {
      ...formData,
      responseData: {
        ...formData.responseData
      }
    };
    
    console.log('Form data structure:', JSON.stringify(updatedFormData, null, 2));
    
    // Now update file fields in the processed data structure
    const updateFileInSection = (sectionId: string, fieldId: string, fileInfo: any) => {
      console.log(`Trying to update file in section ${sectionId}, field ${fieldId}`);
      if (updatedFormData.responseData.sections?.[sectionId]?.fields?.[fieldId]) {
        console.log(`Found field ${fieldId} in section ${sectionId}, updating with file info`);
        updatedFormData.responseData.sections[sectionId].fields[fieldId].value = fileInfo;
        return true;
      }
      return false;
    };
    
    const updateFileInFields = (fieldId: string, fileInfo: any) => {
      console.log(`Trying to update file in top-level field ${fieldId}`);
      if (updatedFormData.responseData.fields?.[fieldId]) {
        console.log(`Found top-level field ${fieldId}, updating with file info`);
        updatedFormData.responseData.fields[fieldId].value = fileInfo;
        return true;
      }
      return false;
    };
    
    // Process all file uploads and update the form data
    Object.entries(uploadResults).forEach(([fieldId, fileInfo]) => {
      console.log(`Processing upload result for field ${fieldId}`);
      
      // Check if this is a nested field in a repeatable
      if (fieldId.includes('.')) {
        const parts = fieldId.split('.');
        if (parts.length === 3) {
          console.log(`Handling repeatable field: ${fieldId}`);
          const repeatableId = parts[0];
          const index = parseInt(parts[1]);
          const subfieldId = parts[2];
          
          // Find which section contains this repeatable field
          let found = false;
          Object.keys(updatedFormData.responseData.sections || {}).forEach(sectionId => {
            // Check if the path with the repeatable ID exists in this section
            const fullFieldId = fieldId; // Use the complete path
            if (updatedFormData.responseData.sections[sectionId]?.fields?.[fullFieldId]) {
              console.log(`Found repeatable field ${fullFieldId} in section ${sectionId}`);
              updatedFormData.responseData.sections[sectionId].fields[fullFieldId].value = fileInfo;
              found = true;
            }
          });
          
          // If not found in sections, check in top level fields
          if (!found && updatedFormData.responseData.fields?.[fieldId]) {
            console.log(`Found repeatable field ${fieldId} in top-level fields`);
            updatedFormData.responseData.fields[fieldId].value = fileInfo;
          }
          
          if (!found) {
            console.log(`WARNING: Could not find field ${fieldId} to update with file info`);
          }
        }
      } else {
        // Handle regular fields - search in all sections first
        let found = false;
        Object.keys(updatedFormData.responseData.sections || {}).forEach(sectionId => {
          if (updateFileInSection(sectionId, fieldId, fileInfo)) {
            found = true;
          }
        });
        
        // If not found in any section, try top level fields
        if (!found) {
          found = updateFileInFields(fieldId, fileInfo);
          if (!found) {
            console.log(`WARNING: Could not find field ${fieldId} to update with file info`);
          }
        }
      }
    });
    
    console.log('Final updated form data:', updatedFormData);
    return updatedFormData;
  };

  useEffect(() => {
    if (uploadState && uploadState.success && uploadState.fileInfo) {
      const fileName = uploadState.fileInfo.name;
      const fieldId = Object.keys(fileFields).find(key => 
        fileFields[key].name === fileName
      );
      
      if (fieldId && !processedUploads.current[fileName]) {
        processedUploads.current[fileName] = true;
        
        setUploadResults(prev => {
        const newUploadResults = {
            ...prev,
          [fieldId]: uploadState.fileInfo
        };
          
          const uploadedCount = Object.keys(newUploadResults).length;
          const allUploadsComplete = Object.keys(fileFields).every(id => {
            return newUploadResults[id] || 
              (uploadState.fileInfo && fileFields[id].name === uploadState.fileInfo.name);
          });
          
          console.log('Upload progress:', {
            uploadedCount,
            totalFiles,
            allUploadsComplete,
            hasFormDataToSubmit: !!formDataToSubmit
          });
          
          setTimeout(() => {
            setUploadedFiles(uploadedCount);
            setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
            
            if (allUploadsComplete && formDataToSubmit && !formReadyToSubmit) {
              console.log('All uploads complete, preparing to submit form');
              
              const dataToSubmit = { ...formDataToSubmit };
              
              setFormDataToSubmit(null);
              setPendingUploads(false);
              setFormReadyToSubmit(true);
              
              const updatedData = updateFormDataWithUploads(dataToSubmit, newUploadResults, fields);
              
              setTimeout(() => {
                console.log('Submitting form with updated file data:', updatedData);
                onSubmit(updatedData)
                  .then((response: any) => {
                    console.log('Form submission complete:', response);
                    if (response && typeof response === 'object' && 'success' in response) {
                      if (response.success) {
                        onSuccessCallback(response);
                      } else if ('error' in response) {
                        setError(response.error as string || 'An error occurred');
                      }
                    }
                    setSubmitting(false);
                  })
                  .catch((error: any) => {
                    console.error('Form submission error:', error);
                    setError(error instanceof Error ? error.message : 'An error occurred');
                    setSubmitting(false);
                  });
              }, 100);
            }
          }, 0);
          
          return newUploadResults;
        });
      }
    } else if (uploadState && !uploadState.success) {
      console.error('Upload failed:', uploadState.error);
      toast({
        title: 'Upload Failed',
        description: uploadState.error || 'Failed to upload file',
        variant: 'destructive',
      });
    }
  }, [uploadState, fileFields, totalFiles, formDataToSubmit, formReadyToSubmit, fields, onSubmit]);
  
  // Define success callback for form submission
  const onSuccessCallback = useCallback((response: any) => {
    console.log('Form submitted successfully:', response);
    toast({
      title: 'Success',
      description: 'Your form has been submitted successfully.',
      variant: 'default',
    });
    setSubmitting(false);
  }, [toast]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Start logging all form data to debug repeatable fields
    console.log("=== FORM SUBMISSION DEBUGGING ===");
    console.log("Complete formData before submission:", formData);
    
    // Look specifically for repeatable fields in the formData
    Object.entries(formData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        console.log(`Found array field ${key} with ${value.length} items:`, value);
      }
    });
    
    // For repeatable fields in template, check if they exist in formData
    fields.forEach(field => {
      if (field.type === 'repeatable') {
        console.log(`Repeatable field in template: ${field.id}`);
        console.log(`Value in formData:`, formData[field.id]);
      }
    });
    
    // Check for any nested fields that might be part of repeatables
    Object.keys(formData).forEach(key => {
      if (key.includes('.')) {
        console.log(`Found nested field key: ${key} with value:`, formData[key]);
      }
    });
    
    if (currentStep !== totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setSubmitting(true);
    
    // Before the processFormResponse call
    const formDataToSubmit = formData;
    
    const processedResponseData = processFormResponse(formDataToSubmit);
    console.log('Processed response data:', processedResponseData);
    
    // Check specifically for repeatable fields in processed data
    const repeatableFieldsInResponse: Record<string, any> = {};
    
    // Check in sections
    Object.entries(processedResponseData.sections || {}).forEach(([sectionId, section]: [string, any]) => {
      Object.entries(section.fields || {}).forEach(([fieldId, field]: [string, any]) => {
        if (field.type === 'repeatable') {
          repeatableFieldsInResponse[`section.${sectionId}.${fieldId}`] = field.value;
          console.log(`Found repeatable field in processedResponseData - section ${sectionId}, field ${fieldId}:`, field.value);
        }
      });
    });
    
    // Check in top-level fields
    Object.entries(processedResponseData.fields || {}).forEach(([fieldId, field]: [string, any]) => {
      if (field.type === 'repeatable') {
        repeatableFieldsInResponse[`field.${fieldId}`] = field.value;
        console.log(`Found repeatable field in processedResponseData - top level field ${fieldId}:`, field.value);
      }
    });
    
    console.log('Summary of repeatable fields in response:', Object.keys(repeatableFieldsInResponse).length);
    
    // Final data for submission
    const finalSubmissionData = {
      templateId: formTemplateId,
      responseData: processedResponseData,
      formData: formDataToSubmit
    };
    
    console.log('Final submission data being sent to onSubmit():', finalSubmissionData);
    
    // Check if there are any files to upload
    const hasNewFilesToUpload = Object.keys(fileFields).length > 0;
    
    if (hasNewFilesToUpload) {
      console.log(`Starting uploads for ${Object.keys(fileFields).length} files`);
      
      // Set these values once at the beginning instead of updating during the loop
      const filesToUpload = Object.keys(fileFields).length;
      setTotalFiles(filesToUpload);
      setPendingUploads(true);
      setUploadedFiles(0);
      setUploadProgress(0);
      
      // For each file, create and start the upload
      for (const [fieldId, file] of Object.entries(fileFields)) {
        console.log(`Uploading file for field ${fieldId}:`, (file as File).name);
        
        // Create upload form data with correct parameters
        const uploadFormData = new FormData();
        uploadFormData.append('file', file as File);
        uploadFormData.append('bucket', 'form-uploads');
        uploadFormData.append('folder', `form-responses/${formTemplateId}`);
        
        // Use the handleUpload function
        handleUpload(uploadFormData);
        
        // Mark this field as being processed to avoid duplicate uploads
        processedUploads.current[(file as File).name] = false;
      }
      
      // Store the form data for submission after all uploads complete
      const formSubmitData = {
        templateId: formTemplateId,
        responseData: processedResponseData,
        formData: formDataToSubmit
      };
      
      console.log('Setting formDataToSubmit for later submission when uploads complete:', formSubmitData);
      
      // Set this to trigger the useEffect to submit the form when uploads are done
      setFormDataToSubmit(formSubmitData);
    } else {
      // No new files to upload, but we need to include any existing file data
      console.log('No new files to upload, submitting form directly with any existing file data');
      
      // Check for existing files in the uploadResults state
      if (Object.keys(uploadResults).length > 0) {
        console.log('Using existing file uploads:', uploadResults);
        
        // Create the form data with the correct structure
        const formSubmitData = {
          templateId: formTemplateId,
          responseData: processedResponseData,
          formData: formDataToSubmit
        };
        
        // Update file fields before submission
        const updatedData = updateFormDataWithUploads(formSubmitData, uploadResults, fields);
        console.log('Submitting form with existing files:', updatedData);
        try {
          const result = await onSubmit(updatedData);
          if (result && typeof result === 'object' && 'success' in result && result.success) {
            onSuccessCallback(result);
          } else if (result && typeof result === 'object' && 'error' in result) {
            setError((result as any).error || 'An error occurred while submitting the form.');
          } else {
            setError('An error occurred while submitting the form.');
          }
        } catch (error) {
          console.error('Form submission error:', error);
          setError(error instanceof Error ? error.message : 'An error occurred while submitting the form.');
        }
      } else {
        // No file uploads at all, just submit the form data
        const formSubmitData = {
          templateId: formTemplateId,
          responseData: processedResponseData,
          formData: formDataToSubmit
        };
        console.log('Submitting form without any file data:', formSubmitData);
        try {
          const result = await onSubmit(formSubmitData);
          if (result && typeof result === 'object' && 'success' in result && result.success) {
            onSuccessCallback(result);
          } else if (result && typeof result === 'object' && 'error' in result) {
            setError((result as any).error || 'An error occurred while submitting the form.');
          } else {
            setError('An error occurred while submitting the form.');
          }
        } catch (error) {
          console.error('Form submission error:', error);
          setError(error instanceof Error ? error.message : 'An error occurred while submitting the form.');
        }
      }
      
      setSubmitting(false);
    }
  };

  // Watching for upload state changes to handle file uploads
  useEffect(() => {
    if (!uploadState || !uploadState.success || !uploadState.fileInfo) {
      return;
    }
    
    const { name: fileName, url, path, size, type } = uploadState.fileInfo;
    
    // Find which field this upload belongs to
    const fieldId = Object.keys(fileFields).find(key => 
      fileFields[key].name === fileName
    );
    
    if (!fieldId) {
      console.log(`Could not find field for uploaded file: ${fileName}`);
      return;
    }
    
    // Skip if we've already processed this file
    if (processedUploads.current[fileName]) {
      console.log(`File ${fileName} already processed, skipping`);
      return;
    }
    
    // Mark as processed
    processedUploads.current[fileName] = true;
    
    console.log(`File upload complete for ${fieldId}: ${fileName}`);
    
    // Store upload result
    setUploadResults(prev => {
      const newResults = {
        ...prev,
        [fieldId]: {
          url,
          path,
          name: fileName,
          size,
          type
        }
      };
      
      // Update upload progress
      const uploadedCount = Object.keys(newResults).length;
      const total = totalFiles || Object.keys(fileFields).length;
      
      setTimeout(() => {
        setUploadedFiles(uploadedCount);
        setUploadProgress(Math.round((uploadedCount / total) * 100));
      }, 0);
      
      // Check if all files have been uploaded
      const allUploadsComplete = Object.keys(fileFields).every(id => {
        return newResults[id] || (fileFields[id].name === fileName);
      });
      
      console.log(`Upload progress: ${uploadedCount}/${total}, all complete: ${allUploadsComplete}`);
      
      if (allUploadsComplete && formDataToSubmit) {
        console.log('All uploads complete, preparing to submit form');
        
        // Make a copy to avoid state dependency issues
        const dataToSubmit = { ...formDataToSubmit };
        
        // Clear formDataToSubmit to avoid resubmission
        setTimeout(() => {
          setFormDataToSubmit(null);
          setPendingUploads(false);
          setFormReadyToSubmit(true);
        }, 0);
        
        // Update with upload results and submit
        const updatedData = updateFormDataWithUploads(dataToSubmit, newResults, fields);
        
        setTimeout(() => {
          console.log('Submitting form with updated file data:', updatedData);
          onSubmit(updatedData)
            .then((response: any) => {
              console.log('Form submission complete:', response);
              if (response && typeof response === 'object' && 'success' in response) {
                if (response.success) {
                  onSuccessCallback(response);
                } else if ('error' in response) {
                  setError(response.error as string || 'An error occurred');
                }
              }
              setSubmitting(false);
            })
            .catch((error: any) => {
              console.error('Form submission error:', error);
              setError(error instanceof Error ? error.message : 'An error occurred');
              setSubmitting(false);
            });
        }, 100);
      }
      
      return newResults;
    });
  }, [uploadState, fileFields, totalFiles, formDataToSubmit, fields, onSubmit, onSuccessCallback]);
  
  // Additional useEffect to handle upload errors
  useEffect(() => {
    if (uploadState && !uploadState.success && uploadState.error) {
      console.error('Upload failed:', uploadState.error);
      toast({
        title: 'Upload Failed',
        description: uploadState.error || 'Failed to upload file',
        variant: 'destructive',
      });
      setPendingUploads(false);
      setSubmitting(false);
    }
  }, [uploadState, toast]);

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
    console.log(`handleFieldChange called for ${fieldId} with value:`, value);
    
    // Check if this is a nested field in a repeatable
    if (fieldId.includes('.')) {
      const parts = fieldId.split('.');
      if (parts.length === 3) { // Format is: repeatableId.index.fieldId
        const repeatableId = parts[0];
        const index = parseInt(parts[1]);
        const subFieldId = parts[2];
        
        // Get the current repeatable items array
        const currentItems = [...(formData[repeatableId] || [])];
        
        // Make sure we have enough items in the array
        while (currentItems.length <= index) {
          currentItems.push({});
        }
        
        // Check if the value actually changed to avoid unnecessary updates
        if (currentItems[index]?.[subFieldId] === value) {
          console.log(`Value for ${fieldId} unchanged, skipping update`);
          return;
        }
        
        // Update the specific field in the specific item
        currentItems[index] = {
          ...currentItems[index],
          [subFieldId]: value
        };
        
        console.log(`Updating repeatable field ${repeatableId}[${index}].${subFieldId} to:`, value);
        console.log(`New repeatable items:`, currentItems);
        
        // Update the whole repeatable field
      setFormData(prev => ({
        ...prev,
          [repeatableId]: currentItems
        }));
        return;
      }
    }
    
    // Handle regular fields
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

  // Safety check to make sure currentStep is valid
  useEffect(() => {
    if (sections.length > 0 && currentStep >= sections.length) {
      console.log('Current step exceeds section count, resetting to 0');
      setCurrentStep(0);
    }
  }, [sections.length, currentStep]);

  // Set total steps based on sections length
  useEffect(() => {
    if (sections.length !== totalSteps) {
      console.log(`Updating total steps: ${sections.length}`);
      setTotalSteps(sections.length);
    }
  }, [sections.length, totalSteps]);

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
      
      // Keep track of repeatables to handle them specially
      const repeatableFields: Record<string, {
        label: string;
        items: any[];
        parentSection?: { id: string; label: string };
      }> = {};

      // Log what we're processing
      console.log(`Processing form response with ${Object.keys(formData).length} form fields`);

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
            // Track repeatable fields separately for special handling
            repeatableFields[field.id] = {
              label: field.label,
              items: formData[field.id] || [],
              parentSection
            };
            
            // Also create a field info entry for the repeatable itself
            fieldInfo[field.id] = {
              label: field.label,
              type: 'repeatable',
              required: field.required,
                  section: parentSection
                };
            
                if (parentSection) {
              sectionMap[parentSection.id].fields.push(field.id);
            }
            
            // Only process the subfields if there are items
            if (formData[field.id] && formData[field.id].length > 0) {
              console.log(`Processing repeatable field ${field.id} with ${formData[field.id].length} items`);
            }
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

      // First process regular fields
      Object.entries(fieldInfo).forEach(([fieldId, field]) => {
        if (field.type !== 'repeatable') {
          let value = formData[fieldId];
          
          // Special handling for file fields - preserve existing file data
          if (field.type === 'file') {
            if (value && typeof value === 'object' && 'url' in value) {
              // This is already a file object, keep it as is
              console.log(`Preserving existing file data for ${fieldId}`);
            } else if (uploadResults[fieldId]) {
              // Use the new upload result if available
              value = uploadResults[fieldId];
              console.log(`Using upload result for ${fieldId}:`, value);
            }
          }
          
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
        }
      });
      
      // Now process repeatable fields specially
      Object.entries(repeatableFields).forEach(([repeatableId, repeatable]) => {
        const items = repeatable.items;
        console.log(`Processing repeatable field ${repeatableId} with ${items.length} items`);
        console.log(`Items content:`, JSON.stringify(items, null, 2));
        
        // Create the repeatable field itself with the array value
        const repeatableFieldData = {
          label: repeatable.label,
          type: 'repeatable',
          required: fieldInfo[repeatableId].required,
          value: items
        };
        
        console.log(`Created repeatableFieldData:`, repeatableFieldData);
        
        // Add to the appropriate section or to top-level fields
        if (repeatable.parentSection) {
          if (!responseData.sections[repeatable.parentSection.id]) {
            responseData.sections[repeatable.parentSection.id] = {
              label: repeatable.parentSection.label,
              fields: {}
            };
          }
          console.log(`Adding repeatable to section ${repeatable.parentSection.id}`);
          responseData.sections[repeatable.parentSection.id].fields[repeatableId] = repeatableFieldData;
      } else {
          console.log(`Adding repeatable to top-level fields`);
          responseData.fields[repeatableId] = repeatableFieldData;
        }
      });

      // Log a summary of what we're returning
      console.log('Response data summary:', {
        sectionCount: Object.keys(responseData.sections).length,
        fieldCount: Object.keys(responseData.fields).length,
        repeatableCount: Object.keys(repeatableFields).length
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
    // First check if a value was directly passed in the field object (from repeatable fields)
    const fieldValue = field.value !== undefined 
      ? field.value 
      : formData[fieldId] !== undefined 
        ? formData[fieldId] 
        : '';
        
    console.log(`Rendering field ${fieldId} (${fieldType}) with value:`, fieldValue);

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
        // Check if there's an existing file from initialResponseData
        const existingFileData = fieldValue && typeof fieldValue === 'object' 
          ? fieldValue 
          : undefined;
          
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
              value={fileFields[fieldId] 
                ? { 
                    name: fileFields[fieldId].name,
                    size: fileFields[fieldId].size,
                    type: fileFields[fieldId].type,
                path: '',
                    url: URL.createObjectURL(fileFields[fieldId])
                  } 
                : existingFileData 
                  ? existingFileData 
                  : undefined}
              onUpload={(file: File) => handleFieldChange(fieldId, file)}
              onError={(error: string) => console.error('File validation error:', error)}
              onRemove={() => {
                // If removing a file upload, also clear any existing file data
                handleFieldChange(fieldId, null);
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
        console.log(`Rendering repeatable field ${fieldId} with value:`, fieldValue);
        
        return (
          <div className="space-y-4">
            {(fieldValue || [{}]).map((item: any, index: number) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-end">
                    {(fieldValue?.length || 0) > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newItems = [...(fieldValue || [])];
                          newItems.splice(index, 1);
                          handleFieldChange(fieldId, newItems);
                          console.log(`Removed item at index ${index} from ${fieldId}, new value:`, newItems);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {field.repeatableConfig?.fields.map((subfield: any) => {
                      const subfieldId = `${fieldId}.${index}.${subfield.id}`;
                      const subfieldValue = item[subfield.id];
                      
                      console.log(`Rendering subfield ${subfieldId} with value:`, subfieldValue);
                      
                      return (
                        <div key={subfieldId}>
                          {renderField({
                            ...subfield,
                            id: subfieldId,
                            value: subfieldValue,
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
                const newItems = [...currentItems, newItem];
                handleFieldChange(fieldId, newItems);
                console.log(`Added new item to ${fieldId}, new value:`, newItems);
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

  // Add a new useEffect to initialize form data from initialResponseData
  useEffect(() => {
    if (initialResponseData && fields.length > 0) {
      const initialValues: Record<string, any> = {};
      const repeatablesMap: Record<string, any[]> = {};
      
      console.log('Initializing form with data:', initialResponseData);
      
      // First, look for top-level repeatable fields directly
      if (initialResponseData.fields) {
        Object.entries(initialResponseData.fields).forEach(([fieldId, field]: [string, any]) => {
          if (field.type === 'repeatable' && Array.isArray(field.value)) {
            console.log(`Found top-level repeatable field ${fieldId} with ${field.value.length} items:`, field.value);
            repeatablesMap[fieldId] = JSON.parse(JSON.stringify(field.value)); // Deep copy to avoid reference issues
          } else if (field.value !== undefined) {
            // Also capture non-repeatable field values
            initialValues[fieldId] = field.value;
            console.log(`Set initial value for field ${fieldId}:`, field.value);
          }
        });
      }
      
      // Then look for repeatable fields in sections
      if (initialResponseData.sections) {
        Object.entries(initialResponseData.sections).forEach(([sectionId, section]: [string, any]) => {
          if (section.fields) {
            Object.entries(section.fields).forEach(([fieldId, field]: [string, any]) => {
              if (field.type === 'repeatable' && Array.isArray(field.value)) {
                console.log(`Found repeatable field in section ${sectionId}: ${fieldId} with ${field.value.length} items:`, field.value);
                repeatablesMap[fieldId] = JSON.parse(JSON.stringify(field.value)); // Deep copy to avoid reference issues
              } else if (field.value !== undefined) {
                // Also capture non-repeatable field values
                initialValues[fieldId] = field.value;
                console.log(`Set initial value for field ${fieldId} in section ${sectionId}:`, field.value);
              }
            });
          }
        });
      }
      
      // Next, gather nested field values for the case where repeatables are stored as separate fields
      if (initialResponseData.sections) {
        Object.entries(initialResponseData.sections).forEach(([sectionId, section]: [string, any]) => {
          if (section.fields) {
            Object.entries(section.fields).forEach(([fieldId, field]: [string, any]) => {
              if (field.value !== undefined) {
                // Check if this is a nested repeatable field (format: repeatableId.index.fieldId)
                if (fieldId.includes('.')) {
                  const parts = fieldId.split('.');
                  if (parts.length === 3) {
                    const repeatableId = parts[0];
                    const index = parseInt(parts[1]);
                    const subFieldId = parts[2];
                    
                    if (!repeatablesMap[repeatableId]) {
                      repeatablesMap[repeatableId] = [];
                      console.log(`Created new repeatable array for ${repeatableId}`);
                    }
                    
                    // Make sure the array has enough items
                    while (repeatablesMap[repeatableId].length <= index) {
                      repeatablesMap[repeatableId].push({});
                      console.log(`Added empty object at index ${repeatablesMap[repeatableId].length-1} to repeatable ${repeatableId}`);
                    }
                    
                    // Add the value to the right spot
                    repeatablesMap[repeatableId][index][subFieldId] = field.value;
                    console.log(`Set repeatable value: ${repeatableId}[${index}].${subFieldId} = `, field.value);
                  } else {
                    // Regular field
                    initialValues[fieldId] = field.value;
                    console.log(`Set initial value for nested field ${fieldId}:`, field.value);
                  }
                } else if (field.type !== 'repeatable') { // Skip repeatable fields here as we handle them separately
                  // Regular field
                  initialValues[fieldId] = field.value;
                  console.log(`Set initial value for field ${fieldId} in section ${sectionId}:`, field.value);
                }
              }
            });
          }
        });
      }
      
      // Now scan through fields to find any repeatable fields not in the response data
      fields.forEach(field => {
        if (field.type === 'repeatable') {
          console.log(`Checking if repeatable field ${field.id} needs initialization`);
          
          if (!repeatablesMap[field.id]) {
            // Initialize with at least one empty item
            console.log(`Repeatable field ${field.id} not in response data, initializing with default`);
            const defaultMinItems = 1; // Use hardcoded default instead of field.repeatableConfig?.minItems
            const emptyItems = Array(defaultMinItems).fill({}).map(() => {
              // Initialize with blank values for each subfield
              const item = (field.repeatableConfig?.fields || []).reduce((acc: any, subfield: any) => {
                acc[subfield.id] = '';
                return acc;
              }, {});
              return item;
            });
            
            repeatablesMap[field.id] = emptyItems;
            console.log(`Initialized empty repeatable: ${field.id} with ${defaultMinItems} items:`, emptyItems);
          } else {
            console.log(`Repeatable field ${field.id} already initialized with ${repeatablesMap[field.id].length} items`);
          }
        }
      });
      
      // Add all the repeatable fields to the initial values
      Object.entries(repeatablesMap).forEach(([repeatableId, items]) => {
        initialValues[repeatableId] = items;
        console.log(`Setting repeatable field ${repeatableId} with ${items.length} items:`, items);
      });
      
      console.log('Final initial form values:', initialValues);
      setFormData(initialValues);
      
      // Also track existing file fields
      const existingFileResults: Record<string, any> = {};
      
      // Check for existing file uploads in the initialData
      const processFieldsForFiles = (fields: Record<string, any>) => {
        Object.entries(fields).forEach(([fieldId, field]: [string, any]) => {
          if (field.type === 'file' && field.value && typeof field.value === 'object' && 'url' in field.value) {
            existingFileResults[fieldId] = field.value;
            console.log(`Found existing file in ${fieldId}:`, field.value);
          }
        });
      };
      
      // Process both top-level fields and section fields
      processFieldsForFiles(initialResponseData.fields || {});
      Object.values(initialResponseData.sections || {}).forEach((section: any) => {
        processFieldsForFiles(section.fields || {});
      });
        
      if (Object.keys(existingFileResults).length > 0) {
        console.log(`Setting ${Object.keys(existingFileResults).length} existing file uploads`);
        setUploadResults(existingFileResults);
      }
    }
  }, [initialResponseData, fields]);

  // Helper function to upload a file
  const uploadFile = useCallback((file: File, fieldId: string) => {
    console.log(`Starting upload for field ${fieldId}: ${file.name}`);
    
    // Create form data for upload
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('bucket', 'form-uploads');
    uploadFormData.append('folder', `form-responses/${formTemplateId}`);
    
    // Trigger upload
    handleUpload(uploadFormData);
  }, [formTemplateId, handleUpload]);

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

  // Additional safety check for current step validity
  if (currentStep >= sections.length || !sections[currentStep]) {
    console.error('Invalid current step or section is not properly defined');
    return (
      <div className="p-4 text-center text-muted-foreground">
        Form structure issue detected. Please reload the page.
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
            <p className="text-sm text-muted-foreground">
              {sections[currentStep]?.label || `Section ${currentStep + 1}`}
            </p>
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