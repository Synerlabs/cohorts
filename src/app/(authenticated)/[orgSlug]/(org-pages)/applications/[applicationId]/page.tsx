import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { ApplicationHeader } from "./_components/application-header";
import { ApplicationOverviewCard } from "./_components/application-overview-card";
import { FormResponseCard } from "./_components/form-response-card";
import { notFound } from "next/navigation";
import { ApplicationService } from "@/services/application.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AtSign, Building, FileText, UserSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { createServiceRoleClient } from '@/lib/utils/supabase/server';

interface ApplicationDetailsProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    applicationId: string;
    slug: string;
  };
}

async function ApplicationDetailsPage({ org, params: _params, userPermissions }: ApplicationDetailsProps) {
  const params = await _params;

  // Get application base data
  const applicationBase = await ApplicationService.getApplicationBase(params.applicationId);

  // Get application details
  let application;
  try {
    application = await ApplicationService.getApplicationDetails(params.applicationId);
  } catch (error) {
    if ((error as Error).message.includes('not found')) {
      notFound();
    }
    throw error;
  }

  // Get form response if available
  let formResponse = null;
  let formTemplate = null;
  if (applicationBase?.form_response_id) {
    const formData = await ApplicationService.getFormResponse(applicationBase.form_response_id);
    if (formData) {
      formResponse = formData.formResponse;
      formTemplate = formData.formTemplate;
    }
  }

  // Get organization details if available
  let organizationDetails = null;
  if (applicationBase?.metadata?.organizationId) {
    try {
      // Fetch the organization details from the group table using the organizationId
      const supabase = await createServiceRoleClient();
      const { data: orgData, error } = await supabase
        .from('group')
        .select('*')
        .eq('id', applicationBase.metadata.organizationId)
        .single();
      
      if (error) {
        console.error('Error fetching organization details:', error);
        // Fallback to metadata if fetch fails
        organizationDetails = {
          id: applicationBase.metadata.organizationId || '',
          name: applicationBase.metadata.organizationName || 'Unknown Organization',
        };
      } else if (orgData) {
        // Use the fetched organization data
        organizationDetails = {
          id: orgData.id,
          name: orgData.name,
          alternateName: orgData.alternate_name,
          type: orgData.type,
          description: orgData.description,
          slug: orgData.slug,
        };
      }
    } catch (error) {
      console.error('Error fetching organization details:', error);
      // Fallback to metadata
      organizationDetails = {
        id: applicationBase.metadata.organizationId || '',
        name: applicationBase.metadata.organizationName || 'Unknown Organization',
      };
    }
  }

  return (
    <div className="space-y-6">
      <ApplicationHeader 
        title="Application Details"
        description="View membership application details and responses."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Application Overview - Takes 4 columns on large screens */}
        <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-6">
          <ApplicationOverviewCard 
            application={application} 
            userPermissions={userPermissions}
          />
        </div>

        {/* Form Response - Takes 8 columns on large screens */}
        <div className="lg:col-span-8">
          {/* Organization Details Card */}
          {organizationDetails && (
            <Card className="mb-6 border shadow-sm">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <h3 className="font-medium text-sm">Requesting Organization</h3>
                </div>
                {organizationDetails.slug && (
                  <Badge variant="secondary" className="h-6">
                    <Link href={`/@${organizationDetails.slug}`} className="hover:underline flex items-center gap-1">
                      <AtSign className="h-3 w-3" />
                      {organizationDetails.slug}
                    </Link>
                  </Badge>
                )}
              </div>
              <CardContent className="p-4">
                <div className="grid gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Name</p>
                    <p className="text-sm font-medium" title={organizationDetails.name}>
                      {organizationDetails.name}
                    </p>
                    {organizationDetails.alternateName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Also known as: {organizationDetails.alternateName}
                      </p>
                    )}
                  </div>
                  
                  {organizationDetails.type && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <p className="text-sm">{organizationDetails.type}</p>
                    </div>
                  )}
                  
                  {organizationDetails.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Description</p>
                      <p className="text-sm text-muted-foreground">{organizationDetails.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {formTemplate && (
            <FormResponseCard
              template={formTemplate}
              formResponse={formResponse}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(ApplicationDetailsPage, { permissions: [permissions.applications.view] }); 