import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { notFound } from "next/navigation";
import { ApplicationService } from "@/services/application.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserApplicationActions } from "../_components/user-application-actions";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, CreditCard, FileText, User } from "lucide-react";
import Link from "next/link";
import { FormResponseCard } from "../../../applications/[applicationId]/_components/form-response-card";
import { getGroupUser } from "@/services/user.service";

interface UserApplicationDetailsProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    applicationId: string;
    orgSlug: string;
  };
}

async function UserApplicationDetailsPage({ org, user, params: _params }: UserApplicationDetailsProps) {
  const params = await _params;

  // Ensure user is defined
  if (!user) {
    console.error('user not found');
    notFound();
  }

  // Get application base data
  const applicationBase = await ApplicationService.getApplicationBase(params.applicationId);
  const groupUser = await getGroupUser({userId: user.id, groupId: org.id});
  
  // Verify this application belongs to the current user
  // Use type assertion to access group_user_id which exists in the database but not in the TypeScript interface
  if (!applicationBase || (applicationBase as any).group_user_id !== groupUser?.id) {
    console.error('applicationBase not found');
    notFound();
  }

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

  // Helper to get status badge color
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'pending_payment':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
  };

  // Helper to get user-friendly status text
  const getStatusText = (status: string) => {
    switch(status) {
      case 'approved':
        return 'APPROVED';
      case 'rejected':
        return 'REJECTED';
      case 'pending_payment':
        return 'PAYMENT REQUIRED';
      case 'pending':
        return 'PENDING REVIEW';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  // Access order_id using type assertion as it exists in the database but not in the TypeScript interface
  const orderId = (application as any).order_id;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Button variant="outline" size="sm" className="text-sm" asChild>
          <Link href={`/@${org.slug}/user/applications`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Application Details</h1>
        <p className="text-sm text-muted-foreground">
          View and manage your membership application.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Application Overview - Takes 4 columns on large screens */}
        <div className="lg:col-span-4 lg:self-start lg:sticky lg:top-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Application Overview</CardTitle>
              <CardDescription>Details of your application</CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Status Badge - Top section */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1.5">Application Status</p>
                <Badge variant="outline" className={`${getStatusBadgeClass(application.status)} px-2.5 py-1`}>
                  {getStatusText(application.status)}
                </Badge>
                
                {application.status === 'pending' && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your application is being reviewed by the organization.
                  </p>
                )}
                
                {application.status === 'pending_payment' && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Please complete payment to finalize your application.
                  </p>
                )}

                {/* Move payment button here for better visibility */}
                {application.status === 'pending_payment' && (
                  <div className="mt-3">
                    <Button className="w-full" asChild>
                      <Link href={`/@${org.slug}/join/payments?applicationId=${application.id}`}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {orderId ? 'Complete Payment' : 'Process Payment'}
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              
              <Separator className="my-4" />
              
              {/* Application Info */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Application Date</span>
                  </div>
                  <p className="text-sm pl-6">{formatDate(application.submitted_at)}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Member Tier</span>
                  </div>
                  <p className="text-sm pl-6">{application.product_name}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Price</span>
                  </div>
                  <p className="text-sm pl-6">
                    {application.product_price > 0 
                      ? `$${(application.product_price / 100).toFixed(2)} ${application.product_currency}`
                      : "Free"}
                  </p>
                </div>
                
                {orderId && (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Order ID</span>
                    </div>
                    <p className="text-sm pl-6">{orderId}</p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />
              
              {/* Application Actions */}
              <div className="mt-6">
                <UserApplicationActions 
                  applicationId={application.id}
                  status={application.status}
                  orgSlug={org.slug}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form Response - Takes 8 columns on large screens */}
        <div className="lg:col-span-8">
          {formTemplate ? (
            <FormResponseCard
              template={formTemplate}
              formResponse={formResponse}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Application Form</CardTitle>
                <CardDescription>No form was required for this application</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(UserApplicationDetailsPage, {
  onAccessDenied: { action: "error" }
}); 