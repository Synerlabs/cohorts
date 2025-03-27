import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound, redirect } from "next/navigation";
import { ApplicationService } from "@/services/application.service";
import { FormResponseService } from "@/services/form-response.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageProps } from "@/lib/types/next";
import { createClient } from "@/lib/utils/supabase/server";
import { ClientFormWrapper } from "./_components/client-form-wrapper";

// Define custom props for this page
interface EditApplicationPageCustomProps extends PageProps {
  params: Promise<{
    applicationId: string;
    orgSlug: string;
    slug: string;
  }>;
}

// Use the custom props with OrgAccessHOCProps
type EditApplicationPageProps = OrgAccessHOCProps & EditApplicationPageCustomProps;

// This is a server component that prepares data for the client
async function EditApplicationPage({ org, user, params }: EditApplicationPageProps) {
  // Ensure user is logged in
  if (!user) {
    notFound();
  }
  
  const { applicationId, orgSlug } = await params;
  
  // Get application details
  const applicationBase = await ApplicationService.getApplicationBase(applicationId);
  if (!applicationBase || !applicationBase.form_response_id) {
    notFound();
  }
  
  // Use any type to bypass type issues
  let application: any;
  try {
    application = await ApplicationService.getApplicationDetails(applicationId);
  } catch (error) {
    notFound();
  }
  
  // Make sure user owns this application - first check direct user ID match
  let userOwnsApplication = application.user?.id === user.id;
  
  // If not a direct match, check the group_user relationship
  if (!userOwnsApplication && application.group_user_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("group_users")
      .select("user_id")
      .eq("id", application.group_user_id)
      .single();
    
    userOwnsApplication = data?.user_id === user.id;
  }
    
  if (!userOwnsApplication) {
    notFound();
  }
  
  // Verify application is in 'pending' status and can be edited
  if (application.status !== 'pending') {
    redirect(`/@${orgSlug}/applications/${applicationId}`);
  }
  
  // Get form response and template
  const formResponseData = await FormResponseService.getFormResponse(applicationBase.form_response_id);
  if (!formResponseData) {
    notFound();
  }
  
  const { formResponse, formTemplate } = formResponseData;
  
  // Serialize all data to ensure it's safe to pass to client components
  const serializedFormTemplate = JSON.parse(JSON.stringify(formTemplate));
  const serializedResponseData = JSON.parse(JSON.stringify(formResponse.response_data));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Application</h1>
          <p className="text-sm text-muted-foreground">
            Update your application form response.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/@${orgSlug}/user/applications`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Applications
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{serializedFormTemplate.title}</CardTitle>
          {serializedFormTemplate.description && (
            <p className="text-sm text-muted-foreground">{serializedFormTemplate.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <ClientFormWrapper
            formTemplateId={serializedFormTemplate.id}
            formTemplate={serializedFormTemplate}
            initialResponseData={serializedResponseData}
            formResponseId={formResponse.id}
            orgSlug={orgSlug}
          />
          <div className="mt-4 text-sm text-muted-foreground">
            <p>Note: Your previous responses will be loaded automatically when the form initializes.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default withOrgAccess(EditApplicationPage); 