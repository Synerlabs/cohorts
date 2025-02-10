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
  if (field.type === 'repeatable' && sectionId && repeatableItems) {
    if (repeatableItems.length === 0) {
      return (
        <div key={field.id} className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">{field.label}</h4>
          <p className="text-sm italic text-muted-foreground">No items added</p>
        </div>
      );
    }

    return (
      <div key={field.id} className="space-y-4">
        <h4 className="text-base font-medium text-muted-foreground">{field.label}</h4>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {repeatableItems.map(({ index, fields }) => (
            <Card key={`${field.id}-${index}`} className="overflow-hidden">
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle className="text-sm font-medium">
                  {field.repeatableConfig?.itemLabel || `Item ${index + 1}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3">
                  {field.repeatableConfig?.fields.map((subfield) => {
                    const matchingField = fields.find((f) => f.key.endsWith(subfield.id));
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
          ))}
        </div>
      </div>
    );
  }

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