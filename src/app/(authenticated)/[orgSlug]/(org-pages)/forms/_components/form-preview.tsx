'use client';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { FormField } from './form-field';
import { PlusCircle } from 'lucide-react';

interface FormPreviewProps {
  title: string;
  description?: string;
  fields: any[];
}

export function FormPreview({ title, description, fields }: FormPreviewProps) {
  const renderField = (field: any) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            placeholder={field.textConfig?.placeholder}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'textarea':
        return (
          <Textarea
            placeholder={field.textConfig?.placeholder}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            placeholder={field.emailConfig?.placeholder}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={field.numberConfig?.placeholder}
            min={field.numberConfig?.min}
            max={field.numberConfig?.max}
            step={field.numberConfig?.step}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'radio':
        return (
          <RadioGroup disabled aria-disabled>
            {field.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} disabled />
                <Label htmlFor={option.value} className="opacity-70">{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: any) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox id={option.value} disabled aria-disabled />
                <Label htmlFor={option.value} className="opacity-70">{option.label}</Label>
              </div>
            ))}
          </div>
        );

      case 'select':
        return (
          <Select disabled>
            <SelectTrigger className="max-w-lg" aria-disabled>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value} disabled>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'file':
        return (
          <div className="opacity-70">
            <FileUpload
              accept={field.fileConfig?.accept}
              maxSize={field.fileConfig?.maxSize}
              onUpload={() => {}}
              onError={() => {}}
              value={null}
              onRemove={() => {}}
            />
          </div>
        );

      case 'section':
        return (
          <div className="space-y-4">
            {field.sectionConfig?.description && (
              <p className="text-sm text-muted-foreground">
                {field.sectionConfig.description}
              </p>
            )}
            <div className="space-y-6">
              {field.sectionConfig?.fields.map((subfield: any) => (
                <div key={subfield.id} className="space-y-2">
                  <Label>
                    {subfield.label}
                    {subfield.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {subfield.helpText && (
                    <p className="text-sm text-muted-foreground">
                      {subfield.helpText}
                    </p>
                  )}
                  {renderField(subfield)}
                </div>
              ))}
            </div>
          </div>
        );

      case 'repeatable':
        return (
          <div className="space-y-4">
            <div className="space-y-6 border rounded-lg p-4 border-muted">
              {field.repeatableConfig?.fields.map((subfield: any) => (
                <div key={subfield.id} className="space-y-2">
                  <Label>
                    {subfield.label}
                    {subfield.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {subfield.helpText && (
                    <p className="text-sm text-muted-foreground">
                      {subfield.helpText}
                    </p>
                  )}
                  {renderField(subfield)}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 opacity-70"
              disabled
              aria-disabled
            >
              <PlusCircle className="h-4 w-4" />
              {field.repeatableConfig?.addLabel || 'Add Item'}
            </Button>
          </div>
        );

      case 'phone':
        return (
          <Input
            type="tel"
            placeholder={field.phoneConfig?.placeholder || 'Enter phone number'}
            pattern={field.phoneConfig?.format}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            min={field.dateConfig?.min}
            max={field.dateConfig?.max}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            min={field.timeConfig?.min}
            max={field.timeConfig?.max}
            step={field.timeConfig?.step}
            disabled
            className="max-w-lg"
            aria-disabled
          />
        );

      case 'group':
        return (
          <div className="space-y-4">
            {field.groupConfig?.description && (
              <p className="text-sm text-muted-foreground">
                {field.groupConfig.description}
              </p>
            )}
            <div className="space-y-6 pl-4 border-l-2">
              {field.fields?.map((subfield: any) => (
                <div key={subfield.id} className="space-y-2">
                  <Label>
                    {subfield.label}
                    {subfield.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {subfield.helpText && (
                    <p className="text-sm text-muted-foreground">
                      {subfield.helpText}
                    </p>
                  )}
                  {renderField(subfield)}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{title || 'Untitled Form'}</h1>
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="space-y-8">
          {fields.map((field) => (
            <div key={field.id} className="space-y-4">
              {field.type === 'section' ? (
                <>
                  <h2 className="text-lg font-medium">{field.label}</h2>
                  {renderField(field)}
                </>
              ) : (
                <>
                  <Label>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  {field.helpText && (
                    <p className="text-sm text-muted-foreground">
                      {field.helpText}
                    </p>
                  )}
                  {renderField(field)}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button disabled aria-disabled>Submit</Button>
        </div>
      </div>
    </Card>
  );
} 