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
import { FileUploadResult } from '@/services/file-upload.service';
import { cn } from '@/lib/utils';

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
      
      // Extract fields from schema, preserving all field properties
      const fields = parsedSchema.fields?.map((field: any) => ({
        ...field,
        id: field.id,
        type: field.type?.toLowerCase(), // Normalize field type
        label: field.label,
        required: field.required,
        help_text: field.help_text,
        placeholder: field.placeholder,
        options: field.options,
        sectionConfig: field.sectionConfig,
        fileConfig: field.fileConfig,
        textConfig: field.textConfig,
        numberConfig: field.numberConfig,
        emailConfig: field.emailConfig,
        phoneConfig: field.phoneConfig,
        choiceConfig: field.choiceConfig,
      })) || [];

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
      // Upload all files first
      const fileUploads = await Promise.all(
        Object.entries(fileFields).map(async ([fieldId, file]) => {
          try {
            const result = await uploadFile(file);
            return { fieldId, result };
          } catch (error) {
            console.error(`Error uploading file for field ${fieldId}:`, error);
            throw error;
          }
        })
      );

      // Combine regular form data with file upload results
      const finalFormData = {
        ...formData,
        ...Object.fromEntries(
          fileUploads.map(({ fieldId, result }) => [fieldId, result])
        )
      };

      await onSubmit(finalFormData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'section') {
      return (
        <div key={field.id} className={cn("space-y-4 transition-opacity", {
          "animate-in fade-in": true,
        })}>
          {field.label && (
            <h3 className="font-medium text-lg">{field.label}</h3>
          )}
          {field.help_text && (
            <p className="text-sm text-muted-foreground">{field.help_text}</p>
          )}
          <div className="space-y-6">
            {field.sectionConfig?.fields?.map(renderField)}
          </div>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-2">
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
            {field.options.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
              </div>
            ))}
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
              {field.options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
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
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
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