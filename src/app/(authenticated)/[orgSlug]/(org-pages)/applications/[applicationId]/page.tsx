import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/utils/supabase/server";
import { permissions } from "@/lib/types/permissions";

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
  let formResponse = null;
  let formFields: Record<string, { label: string; type: string }> = {};
  console.log("Application", application);
  if (applicationBase?.form_response_id) {
    const { data: formResponseData, error: formResponseError } = await supabase
      .from('form_responses')
      .select('*, form_templates(*)')
      .eq('id', applicationBase.form_response_id)
      .single();

    if (!formResponseError && formResponseData) {
        console.log("Error", formResponseError);
      formResponse = formResponseData;
      // Parse the form template schema to get field labels
      try {
        const schema = typeof formResponseData.form_templates.schema === 'string' 
          ? JSON.parse(formResponseData.form_templates.schema) 
          : formResponseData.form_templates.schema;
        
        // Recursively extract fields from sections
        const extractFields = (fields: any[]) => {
          fields.forEach(field => {
            if (field.type === 'section' && field.sectionConfig?.fields) {
              extractFields(field.sectionConfig.fields);
            } else {
              formFields[field.id] = {
                label: field.label,
                type: field.type
              };
            }
          });
        };
        
        if (schema.fields) {
          extractFields(schema.fields);
        }
      } catch (error) {
        console.error('Error parsing form schema:', error);
      }
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

  const formatFieldValue = (value: any, type: string) => {
    if (value === null || value === undefined) return 'Not provided';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return value.toString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Application Details</h1>
        <p className="text-sm text-muted-foreground">
          View membership application details and responses.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Application Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Application Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Applicant Info */}
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarFallback>
                  {application.user_data.full_name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{application.user_data.full_name}</h3>
                <p className="text-sm text-muted-foreground">{application.user_data.email}</p>
              </div>
            </div>

            {/* Application Status */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant={getBadgeVariant(application.status)}>
                    {application.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(application.submitted_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Membership Details */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Membership Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Tier</p>
                  <p className="text-sm text-muted-foreground">{application.product_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Price</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(application.product_price, application.product_currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Duration</p>
                  <p className="text-sm text-muted-foreground">
                    {application.duration_months} months
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Activation Type</p>
                  <p className="text-sm text-muted-foreground">
                    {application.activation_type.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Response */}
        {formResponse && (
          <Card>
            <CardHeader>
              <CardTitle>{formResponse.form_templates.title}</CardTitle>
              {formResponse.form_templates.description && (
                <p className="text-sm text-muted-foreground">
                  {formResponse.form_templates.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Form Fields */}
                {formResponse.response_data?.fields && Object.entries(formResponse.response_data.fields).map(([fieldId, value]) => {
                  const fieldInfo = formFields[fieldId];
                  if (!fieldInfo) return null;
                  
                  return (
                    <div key={fieldId} className="space-y-1">
                      <p className="text-sm font-medium">{fieldInfo.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFieldValue(value, fieldInfo.type)}
                      </p>
                    </div>
                  );
                })}

                {/* File Uploads */}
                {formResponse.response_data?.files && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Uploaded Files</h4>
                    <div className="space-y-2">
                      {Object.entries(formResponse.response_data.files).map(([fieldId, file]: [string, any]) => {
                        const fieldInfo = formFields[fieldId];
                        return (
                          <div key={fieldId} className="flex items-center gap-2">
                            <p className="text-sm font-medium">{fieldInfo?.label || 'File'}:</p>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {file.name}
                            </a>
                            <span className="text-xs text-muted-foreground">
                              ({Math.round(file.size / 1024)}KB)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Show message if no form data */}
                {(!formResponse.response_data?.fields && !formResponse.response_data?.files) && (
                  <p className="text-sm text-muted-foreground">No form data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default withOrgAccess(ApplicationDetailsPage, { permissions: [permissions.applications.view] }); 