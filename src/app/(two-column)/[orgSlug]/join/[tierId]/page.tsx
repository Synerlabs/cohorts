import { notFound } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { IMembershipTierProduct } from "@/lib/types/product";
import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";
import { JoinForm } from "./_components/join-form";
import { MembershipService } from "@/services/membership.service";
import ApplicationStepper from "./_components/application-stepper";
interface JoinPageProps extends Omit<OrgAccessHOCProps, 'params'> {
  params: {
    tierId: string;
    slug: string;
  };
}

type FormTemplate = Database['public']['Tables']['form_templates']['Row'];

async function JoinPage({ org, user, params }: JoinPageProps) {
  if (!user) {
    console.log('user not found');
    notFound();
  }

  const { tierId } = await params;
  
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
              </div>
            </div>

            <div className="space-y-4">
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

export default withOrgAccess(JoinPage, { allowGuest: false }); 