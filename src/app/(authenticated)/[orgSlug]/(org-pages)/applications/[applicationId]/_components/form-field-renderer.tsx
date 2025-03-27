import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormField, FormResponse } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";
import { formatFieldValue, getFieldValue } from "@/lib/utils/form-fields";

interface FormFieldRendererProps {
  field: FormField;
  sectionId?: string;
  value: any;
  repeatableItems?: Array<{ index: number; fields: any[] }>;
  formResponse: FormResponse | null;
}

export function FormFieldRenderer({ field, sectionId, value, repeatableItems, formResponse }: FormFieldRendererProps) {
  console.log(`Rendering field: ${field.id}, type: ${field.type}, sectionId: ${sectionId || 'none'}`);
  
  if (field.type === 'repeatable') {
    console.log(`Processing repeatable field: ${field.id}`);
    console.log(`Direct value:`, value);
    console.log(`RepeatableItems provided:`, repeatableItems ? `${repeatableItems.length} items` : 'none');
    
    // Get the repeatable config for this field from the template schema
    if (!field.repeatableConfig?.fields) {
      console.log(`Warning: field ${field.id} is marked as repeatable but has no repeatableConfig`);
    }
  }
  
  // If this is a repeatable field with items from the repeatableItems prop or direct value array
  if (field.type === 'repeatable' && field.repeatableConfig?.fields) {
    // First check if we have repeatableItems provided
    if (repeatableItems && repeatableItems.length > 0) {
      console.log(`Rendering ${repeatableItems.length} repeatable items for ${field.id}`);
      return renderRepeatableItems(field, repeatableItems);
    }
    
    // Otherwise check if the value itself is an array (direct value from form response)
    if (Array.isArray(value) && value.length > 0) {
      console.log(`Converting direct value array to repeatableItems format`);
      const convertedItems = value.map((item, index) => ({
        index,
        fields: Object.entries(item).map(([key, fieldValue]) => ({
          key: `${field.id}.${index}.${key}`,
          value: fieldValue
        }))
      }));
      
      console.log(`Converted ${convertedItems.length} items`);
      return renderRepeatableItems(field, convertedItems);
    }
    
    // No items found in either format
    console.log(`No repeatable items found for ${field.id}`);
    return (
      <div key={field.id} className="space-y-1">
        <h4 className="text-sm font-medium text-muted-foreground">{field.label}</h4>
        <p className="text-sm italic text-muted-foreground">No items added</p>
      </div>
    );
  }
  
  // Non-repeatable field rendering continues below...
  const formattedValue = formatFieldValue(value, field.type);

  if (field.type === 'file') {
    if (!value) {
      return (
        <div key={field.id} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
          <p className="text-sm italic text-muted-foreground">No file uploaded</p>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
        <div className="flex items-center gap-2">
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <FileText className="h-3 w-3" />
            {value.name}
          </a>
          <Badge variant="secondary" className="text-xs">
            {Math.round(value.size / 1024)}KB
          </Badge>
        </div>
      </div>
    );
  }

  if (field.type === 'signature') {
    if (!value) {
      return (
        <div key={field.id} className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
          <p className="text-sm italic text-muted-foreground">No signature provided</p>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
        <div className="border rounded p-2 bg-white">
          <img 
            src={value} 
            alt="Signature" 
            className="max-h-24 object-contain"
          />
        </div>
      </div>
    );
  }

  if (field.type === 'group') {
    return (
      <Card key={field.id} className="overflow-hidden">
        <CardHeader className="bg-muted/50 pb-4">
          <CardTitle className="text-base font-medium">{field.label}</CardTitle>
          {field.groupConfig?.description && (
            <p className="text-sm text-muted-foreground">{field.groupConfig.description}</p>
          )}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {field.groupConfig?.fields?.map((subfield) => {
              const subfieldValue = sectionId ? 
                formResponse?.response_data.sections[sectionId]?.fields[subfield.id]?.value : 
                formResponse?.response_data.fields[subfield.id]?.value;
              
              return (
                <div key={subfield.id} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{subfield.label}</p>
                  <p className="text-sm">
                    {subfieldValue || <span className="italic text-muted-foreground">Not provided</span>}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div key={field.id} className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
      <p className="text-sm">
        {formattedValue || <span className="italic text-muted-foreground">Not provided</span>}
      </p>
    </div>
  );
}

// Helper function to render repeatable items consistently
function renderRepeatableItems(field: FormField, items: Array<{ index: number; fields: any[] }>) {
  return (
    <div key={field.id} className="space-y-4">
      <h4 className="text-base font-medium text-muted-foreground">{field.label}</h4>
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {items.map(({ index, fields }) => {
          console.log(`Rendering item ${index} with ${fields.length} fields`);
          return (
            <Card key={`${field.id}-${index}`} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle className="text-sm font-medium">
                  {field.repeatableConfig?.itemLabel || `Item ${index + 1}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3">
                  {field.repeatableConfig?.fields.map((subfield) => {
                    // Try both formats: looking for ends with subfield.id or direct match
                    const matchingField = fields.find((f) => 
                      f.key.endsWith(subfield.id) || 
                      f.key === subfield.id
                    );
                    
                    console.log(`Subfield ${subfield.id}: ${matchingField ? 'found' : 'not found'}`);
                    if (!matchingField) return null;
                    
                    return (
                      <div key={matchingField.key} className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">{subfield.label}</p>
                        <p className="text-sm">
                          {matchingField.value || 'Not provided'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 