import { redirect } from "next/navigation";
import { MembershipSelection } from "./components/MembershipSelection";
import { getOrgBySlug } from "@/services/org.service";
import { ProductService } from "@/services/product.service";
import { getUserMembershipApplications } from "@/services/applications.service";
import { getCurrentUser } from "@/services/user.service";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { Button } from "@/components/ui/button";
import { CreditCard, ChevronRight, AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { IMembershipTierProduct } from "@/lib/types/product";
import { getUserMembership } from "@/services/join.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ActiveMembershipDisplay } from "./components/ActiveMembershipDisplay";
import { OrganizationSelection } from "./components/OrganizationSelection";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CamelizedGroup = Camelized<Tables<"group">>;

async function getMembershipData(orgId: string, isDeleted = false): Promise<IMembershipTierProduct[]> {
  const memberships = await ProductService.getMembershipTiers(orgId);
  return memberships;
}

async function JoinPage({ org, params }: OrgAccessHOCProps) {
  const _params = await params;
  const { data, error } = await getCurrentUser();
  const memberships = await getMembershipData(org.id);

  if (error || !data?.user) {
    return (
      <div className="container max-w-5xl py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Join {org.name}</h1>
            <p className="text-base text-muted-foreground mb-8">Create an account to join this organization and access member benefits.</p>
          </div>
          <Card className="shadow-lg border-muted/60">
            <CardHeader>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>
                Fill out the form below to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RegistrationForm orgId={org.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // First check for active membership
  const userMembership = await getUserMembership({ userId: data.user.id, groupId: org.id });
  
  if (userMembership && userMembership.status === 'active') {
    return (
      <div className="container max-w-4xl py-12 space-y-8">
        <ActiveMembershipDisplay 
          membership={userMembership} 
          orgSlug={org.slug}
        />
      </div>
    );
  }

  // Get user's applications
  const applications = await getUserMembershipApplications(data.user.id, org.id);
  const latestApplication = applications[0];

  // Filter membership tiers based on type
  const membershipTiers = memberships.filter(tier => tier.membership_tier?.type !== 'organization');
  const orgTiers = memberships.filter(tier => tier.membership_tier?.type === 'organization');

  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Join {org.name}</h1>
        <p className="text-muted-foreground mt-2">
          Choose a membership option below to get started
        </p>
      </div>

      {/* Display membership tiers for individuals */}
      {membershipTiers.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-8">Individual Membership Options</h2>
          <MembershipSelection 
            memberships={membershipTiers} 
            groupId={org.id} 
            userId={data.user.id} 
          />
        </>
      )}

      {/* Display organization tiers if available */}
      {orgTiers.length > 0 && (
        <>
          <h2 className="text-2xl font-bold mt-12">Organization Affiliation Options</h2>
          <p className="text-muted-foreground mb-4">
            Affiliate your organization with {org.name}
          </p>
          
          {orgTiers.map(tier => (
            <div key={tier.id} className="mb-6">
              <OrganizationSelection 
                tier={tier}
                groupId={org.id}
                userId={data.user.id}
              />
            </div>
          ))}
        </>
      )}
      
      {applications.length > 0 && (
        <div className="mt-8">
          <Alert>
            <AlertTitle className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              You have pending applications
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <div className="text-sm mb-4">You have already applied for membership. Check your application status:</div>
                <Link href={`/${org.slug}/applications`} className="inline-flex items-center text-primary">
                  View my applications
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}

export default withOrgAccess(JoinPage, { allowGuest: true });