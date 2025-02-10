import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/server";
import { permissions } from "@/lib/types/permissions";
import { FileText } from "lucide-react";

interface FormField {
  type: string;
  label: string;
  value: any;
  required: boolean;
}

interface FormSection {
  label: string;
  fields: Record<string, FormField>;
}

interface FormResponseData {
  fields: Record<string, FormField>;
  sections: Record<string, FormSection>;
}

interface FormResponse {
  id: string;
  template_id: string;
  response_data: FormResponseData;
  form_templates: {
    id: string;
    title: string;
    description?: string;
  };
}

interface FormTemplate {
  id: string;
  title: string;
  description?: string;
  schema: {
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required: boolean;
      sectionConfig?: {
        fields: Array<{
          id: string;
          type: string;
          label: string;
          required: boolean;
        }>;
      };
    }>;
  };
}

interface ApplicationDetailsProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    applicationId: string;
    slug: string;
  };
}

async function ApplicationDetailsPage({ org, params: _params }: ApplicationDetailsProps) {
    const params = await _params;
  const supabase = await createClient();

  // First fetch the application from applications table to get form_response_id
  const { data: applicationBase, error: applicationBaseError } = await supabase
    .from('applications')
    .select('form_response_id')
    .eq('id', params.applicationId)
    .single();

  if (applicationBaseError) {
    console.error('Error loading application base:', applicationBaseError);
    return (
      <div className="p-4 text-center text-muted-foreground">
        Error loading application details.
      </div>
    );
  }

  // Then fetch the application details from the view
  const { data: application, error: applicationError } = await supabase
    .from('membership_applications_view')
    .select('*')
    .eq('id', params.applicationId)
    .single();

  if (applicationError) {
    console.error('Error loading application:', applicationError);
    return (
      <div className="p-4 text-center text-muted-foreground">
        Error loading application details.
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Application not found.
      </div>
    );
  }

  // If there's a form response, fetch it
  let formResponse: FormResponse | null = null;
  let formTemplate: FormTemplate | null = null;
  console.log("Application", application);
  if (applicationBase?.form_response_id) {
    const { data: formResponseData, error: formResponseError } = await supabase
      .from('form_responses')
      .select('*, form_templates(*)')
      .eq('id', applicationBase.form_response_id)
      .single();

    if (!formResponseError && formResponseData) {
      // Parse the template schema
      formTemplate = {
        id: formResponseData.form_templates.id,
        title: formResponseData.form_templates.title,
        description: formResponseData.form_templates.description,
        schema: typeof formResponseData.form_templates.schema === 'string' 
          ? JSON.parse(formResponseData.form_templates.schema)
          : formResponseData.form_templates.schema
      };

      // Ensure response_data has the correct structure
      const rawResponseData = formResponseData.response_data?.responseData || {};
      console.log('Raw response data:', rawResponseData);
      
      const validatedResponseData: FormResponseData = {
        fields: typeof rawResponseData.fields === 'object' ? rawResponseData.fields : {},
        sections: typeof rawResponseData.sections === 'object' ? rawResponseData.sections : {}
      };

      formResponse = {
        id: formResponseData.id,
        template_id: formResponseData.response_data?.templateId || formResponseData.template_id,
        response_data: validatedResponseData,
        form_templates: {
          id: formResponseData.form_templates.id,
          title: formResponseData.form_templates.title,
          description: formResponseData.form_templates.description
        }
      };
      console.log("Validated Form Response:", formResponse);
    }
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'pending_payment':
        return 'secondary';
      case 'approved':
        return 'outline';
      case 'rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(price / 100);
  };

  const getFieldValue = (fieldId: string, sectionId?: string) => {
    if (!formResponse) return null;
    
    if (sectionId) {
      return formResponse.response_data.sections[sectionId].fields[fieldId]?.value;
    }
    return formResponse.response_data.fields[fieldId]?.value;
  };

  const getRepeatableFields = (repeatableId: string, sectionId: string) => {
    if (!formResponse) return [];

    // Get all fields that belong to this repeatable field
    const fields = formResponse.response_data.sections[sectionId].fields;
    const repeatableFields = Object.entries(fields)
      .filter(([key]) => key.startsWith(`${repeatableId}.`))
      .reduce((acc: Record<number, any[]>, [key, value]) => {
        const match = key.match(/^.+\.(\d+)\..+$/);
        if (match) {
          const index = parseInt(match[1]);
          if (!acc[index]) {
            acc[index] = [];
          }
          acc[index].push({ key, ...value });
        }
        return acc;
      }, {});

    return Object.entries(repeatableFields)
      .map(([index, fields]) => ({
        index: parseInt(index),
        fields,
      }))
      .sort((a, b) => a.index - b.index);
  };

  const formatFieldValue = (value: any, type: string) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') {
      if (type === 'file') {
        return value;
      }
      return JSON.stringify(value);
    }
    return value.toString();
  };

  const renderField = (field: any, sectionId?: string) => {
    if (field.type === 'repeatable' && sectionId) {
      const items = getRepeatableFields(field.id, sectionId);

      if (items.length === 0) {
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
            {items.map(({ index, fields }) => (
              <Card key={`${field.id}-${index}`} className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-4">
                  <CardTitle className="text-sm font-medium">
                    {field.repeatableConfig?.itemLabel || `Item ${index + 1}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-3">
                    {field.repeatableConfig?.fields.map((subfield: any) => {
                      const matchingField = fields.find((f: any) => f.key.endsWith(subfield.id));
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

    const value = getFieldValue(field.id, sectionId);
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
              {field.groupConfig?.fields?.map((subfield: any) => renderField(subfield, sectionId))}
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application Details</h1>
        <p className="text-sm text-muted-foreground">
          View membership application details and responses.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Application Overview - Takes 4 columns on large screens */}
        <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-6">
          <Card>
            <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="text-lg">
                    {application.user_data.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-lg">{application.user_data.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{application.user_data.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Applicant Info */}
            

              {/* Application Status */}
              <div className="grid gap-6 border-t pt-6">
                <div className="grid grid-cols-1 gap-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Status</p>
                    <Badge variant={getBadgeVariant(application.status)} className="text-xs">
                      {application.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Submitted</p>
                    <p className="text-sm">
                      {formatDate(application.submitted_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Membership Details */}
              <div className="grid gap-6 border-t pt-6">
                <h4 className="font-medium">Membership Details</h4>
                <div className="grid grid-cols-1 gap-y-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Tier</p>
                    <p className="text-sm">{application.product_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Price</p>
                    <p className="text-sm">
                      {formatPrice(application.product_price, application.product_currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Duration</p>
                    <p className="text-sm">
                      {application.duration_months} months
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1.5">Activation Type</p>
                    <p className="text-sm">
                      {application.activation_type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Response - Takes 8 columns on large screens */}
        <div className="lg:col-span-8">
          {formTemplate && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>{formTemplate.title}</CardTitle>
                {formTemplate.description && (
                  <p className="text-sm text-muted-foreground">
                    {formTemplate.description}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Render all sections from template */}
                  {formTemplate.schema.fields
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
                          {section.sectionConfig?.fields.map(field => renderField(field, section.id))}
                        </div>
                      </div>
                    ))}

                  {/* Render root fields from template */}
                  {formTemplate.schema.fields
                    .filter(field => field.type !== 'section')
                    .length > 0 && (
                    <div className="space-y-6">
                      <div className="border-b pb-2">
                        <h3 className="font-medium text-lg">Additional Information</h3>
                      </div>
                      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                        {formTemplate.schema.fields
                          .filter(field => field.type !== 'section')
                          .map(field => renderField(field))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(ApplicationDetailsPage, { permissions: [permissions.applications.view] }); 