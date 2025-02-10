import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormResponse } from "@/app/(authenticated)/[orgSlug]/(org-pages)/applications/[applicationId]/types";
import { FormFieldRenderer } from "./form-field-renderer";
import { getFieldValue, getRepeatableFields } from "@/lib/utils/form-fields";

interface FormResponseCardProps {
  template: {
    title: string;
    description?: string;
    schema: {
      fields: Array<{
        id: string;
        type: string;
        label: string;
        required: boolean;
        sectionConfig?: {
          description?: string;
          fields: Array<FormField>;
        };
      }>;
    };
  };
  formResponse: FormResponse | null;
}

export function FormResponseCard({ template, formResponse }: FormResponseCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>{template.title}</CardTitle>
        {template.description && (
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Render all sections from template */}
          {template.schema.fields
            .filter(field => field.type === 'section')
            .map(section => (
              <div key={section.id} className="space-y-6">
                <div className="border-b pb-2">
                  <h3 className="font-medium text-lg">{section.label}</h3>
                  {section.sectionConfig?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {section.sectionConfig.description}
                    </p>
                  )}
                </div>
                <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                  {section.sectionConfig?.fields.map(field => (
                    <FormFieldRenderer
                      key={field.id}
                      field={field}
                      sectionId={section.id}
                      value={getFieldValue(formResponse, field.id, section.id)}
                      repeatableItems={field.type === 'repeatable' ? getRepeatableFields(formResponse, field.id, section.id) : undefined}
                      formResponse={formResponse}
                    />
                  ))}
                </div>
              </div>
            ))}

          {/* Render root fields from template */}
          {template.schema.fields
            .filter(field => field.type !== 'section')
            .length > 0 && (
            <div className="space-y-6">
              <div className="border-b pb-2">
                <h3 className="font-medium text-lg">Additional Information</h3>
              </div>
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {template.schema.fields
                  .filter(field => field.type !== 'section')
                  .map(field => (
                    <FormFieldRenderer
                      key={field.id}
                      field={field}
                      value={getFieldValue(formResponse, field.id)}
                      formResponse={formResponse}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 