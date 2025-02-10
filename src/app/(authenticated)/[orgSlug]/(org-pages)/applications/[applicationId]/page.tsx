import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { permissions } from "@/lib/types/permissions";
import { ApplicationHeader } from "./_components/application-header";
import { ApplicationOverviewCard } from "./_components/application-overview-card";
import { FormResponseCard } from "./_components/form-response-card";
import { notFound } from "next/navigation";
import { ApplicationService } from "@/services/application.service";

interface ApplicationDetailsProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    applicationId: string;
    slug: string;
  };
}

async function ApplicationDetailsPage({ org, params: _params }: ApplicationDetailsProps) {
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

  return (
    <div className="space-y-6">
      <ApplicationHeader 
        title="Application Details"
        description="View membership application details and responses."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Application Overview - Takes 4 columns on large screens */}
        <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-6">
          <ApplicationOverviewCard application={application} />
        </div>

        {/* Form Response - Takes 8 columns on large screens */}
        <div className="lg:col-span-8">
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