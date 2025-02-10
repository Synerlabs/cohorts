import { notFound } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { IMembershipTierProduct } from "@/lib/types/product";
import { createClient } from "@/lib/utils/supabase/server";
import { Database } from "@/lib/types/database.types";
import { JoinForm } from "./_components/join-form";
import { MembershipService } from "@/services/membership.service";

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
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <a href={`/@${org.slug}`} className="flex items-center gap-2 font-medium">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEnd className="size-4" />
              </div>
              {org.name}
            </a>
          </div>
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

        <div className="relative hidden lg:block bg-muted">
          <div className="absolute inset-0 p-10 flex flex-col justify-between">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold">Application Process</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background">
                    <span className="text-sm font-medium">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium">Complete Application Form</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Fill out all required information in the membership application form.
                    </p>
                  </div>
                </div>

                {tier.price > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background">
                      <span className="text-sm font-medium">2</span>
                    </div>
                    <div>
                      <h3 className="font-medium">Payment</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Process the membership fee payment of {tier.currency} {(tier.price / 100).toFixed(2)}.
                      </p>
                    </div>
                  </div>
                )}

                {tier.membership_tier.activation_type.includes('review') && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 bg-background">
                      <span className="text-sm font-medium">{tier.price > 0 ? '3' : '2'}</span>
                    </div>
                    <div>
                      <h3 className="font-medium">Application Review</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Our team will review your application and get back to you within 2-3 business days.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Membership Benefits</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Access to exclusive content and resources</li>
                <li>Participate in community events and discussions</li>
                <li>Network with other members</li>
                <li>Full membership access</li>
              </ul>
            </div>
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