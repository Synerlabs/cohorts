import { notFound } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { IMembershipTierProduct } from "@/lib/types/product";
import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";
import { JoinForm } from "./_components/join-form";
import { MembershipService } from "@/services/membership.service";
import ApplicationStepper from "./_components/application-stepper";

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

// Define a simpler component that doesn't extend OrgAccessHOCProps
// The HOC will provide the org and user props
async function JoinPage({
  org,
  user,
  params,
  searchParams
}: {
  org: any;
  user: any;
  params: { tierId: string; slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!user) {
    console.log('user not found');
    notFound();
  }

  const { tierId } = params;
  
  // Extract organization information from search params - convert array values to strings if needed
  const applicationId = typeof searchParams.applicationId === 'string' 
    ? searchParams.applicationId 
    : Array.isArray(searchParams.applicationId) 
      ? searchParams.applicationId[0] 
      : undefined;
      
  const organizationId = typeof searchParams.organizationId === 'string' 
    ? searchParams.organizationId 
    : Array.isArray(searchParams.organizationId) 
      ? searchParams.organizationId[0] 
      : undefined;
      
  const organizationName = typeof searchParams.organizationName === 'string' 
    ? searchParams.organizationName 
    : Array.isArray(searchParams.organizationName) 
      ? searchParams.organizationName[0] 
      : undefined;
      
  const isNewOrg = typeof searchParams.isNewOrg === 'string' 
    ? searchParams.isNewOrg === 'true'
    : Array.isArray(searchParams.isNewOrg) 
      ? searchParams.isNewOrg[0] === 'true'
      : false;
  
  console.log('Organization context for form:', {
    applicationId,
    organizationId,
    organizationName,
    isNewOrg
  });
  
  try {
    const { tier, formTemplate } = await MembershipService.getMembershipTierAndForm(tierId);
    
    return (
      <div className="grid min-h-svh lg:grid-cols-[1fr_2fr]">
        <div className="relative hidden lg:block lg:sticky lg:top-0 lg:h-screen bg-muted">
          <div className="absolute inset-0 p-10 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex justify-center gap-2 md:justify-start">
                <a href={`/@${org.slug}`} className="font-medium">
                  <div className="flex h-6 w-6 mb-2 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <GalleryVerticalEnd className="size-4" />
                  </div>
                  {org.name}
                </a>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {tier.name} Application
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {tier.description}
                </p>
                
                {/* Show organization context if available */}
                {(organizationId || organizationName) && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-800">
                    <p className="font-medium">Organization Information:</p>
                    <p>{isNewOrg ? 'New organization: ' : 'Organization: '} 
                      {organizationName || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 mt-8">
              <h3 className="text-sm">Application Process</h3>
              <ApplicationStepper 
                tier={tier}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex flex-1 items-start justify-center">
            <JoinForm
              tier={tier}
              formTemplate={formTemplate}
              orgId={org.id}
              orgSlug={org.slug}
              userId={user.id}
              applicationId={applicationId}
              organizationId={organizationId}
              organizationName={organizationName}
              isNewOrg={isNewOrg}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error loading membership tier:', error);
    notFound();
  }
}

export default withOrgAccess(JoinPage, { allowGuest: true }); 