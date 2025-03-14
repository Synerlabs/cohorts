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
import { CreditCard, ChevronRight, AlertCircle, Clock, Home, Building, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { IMembershipTierProduct } from "@/lib/types/product";
import { getUserMembership } from "@/services/join.service";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ActiveMembershipDisplay } from "./components/ActiveMembershipDisplay";
import { OrganizationSelection } from "./components/OrganizationSelection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OrganizationRedirectCard } from "./components/OrganizationRedirectCard";

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
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="container max-w-5xl py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary flex items-center">
              <Home className="h-3.5 w-3.5 mr-1" />
              <span>Home</span>
            </Link>
            <span>/</span>
            <span className="font-medium text-foreground">{org.name}</span>
          </div>
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">Join {org.name}</h1>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Create an account to join this organization and access exclusive member benefits.
            </p>
          </div>
          
          <Card className="shadow-lg border-muted/60 max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="text-xl">Create Your Account</CardTitle>
              <CardDescription>
                Fill out the form below to get started with your membership
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
    <div className="min-h-[calc(100vh-4rem)] pb-16">
      <div className="container max-w-6xl py-12">
        {/* Breadcrumb Navigation */}
        {/* <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary flex items-center">
            <Home className="h-3.5 w-3.5 mr-1" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <Link href={`/@${org.slug}`} className="hover:text-primary">
            {org.name}
          </Link>
          <span>/</span>
          <span className="font-medium text-foreground">Join</span>
        </div> */}
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Become a Member</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Choose a membership option below to join {org.name} and access exclusive benefits.
          </p>
        </div>
        
        {/* Applications Alert Section */}
        {applications.length > 0 && (
          <div className="mb-12">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-yellow-700">
                    You have {applications.length} pending membership application{applications.length > 1 ? 's' : ''}.
                    You can track their status or continue with a new application below.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 mt-3">
                    <Link href={`/${org.slug}/applications`} className="w-full">
                      <Button variant="outline" className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800">
                        View Applications
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                    
                    {latestApplication?.status === 'pending_payment' && (
                      <Link href={`/${org.slug}/join/payments?applicationId=${latestApplication.id}`} className="w-full">
                        <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Complete Payment
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Membership Options Section */}
        <div className="space-y-12">
          {/* Individual Memberships */}
          {membershipTiers.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 rounded-full p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Individual Membership Options</h2>
              </div>
              
              <MembershipSelection 
                memberships={membershipTiers} 
                groupId={org.id} 
                userId={data.user.id} 
              />
            </div>
          )}

          {/* Organization Affiliations */}
          {orgTiers.length > 0 && (
            <div className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 rounded-full p-2">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Organization Affiliation Options</h2>
              </div>
              
              <div className="text-muted-foreground mb-8">
                <p>Affiliate your organization with {org.name} to establish a formal relationship and gain access to organization-specific benefits.</p>
              </div>
              
              {orgTiers.map(tier => (
                <div key={tier.id} className="mb-8">
                  <OrganizationRedirectCard
                    tier={tier}
                    groupId={org.id}
                    userId={data.user.id}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Membership Benefits */}
        <div className="mt-16 pt-8 border-t">
          <h3 className="text-xl font-semibold mb-6 text-center">Membership Benefits</h3>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <div className="bg-blue-100 p-1.5 rounded-full">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  Community Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Connect with other members, participate in discussions, and build valuable professional relationships.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100 hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <div className="bg-emerald-100 p-1.5 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  Exclusive Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Access members-only content, tools, and resources to help you succeed.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 hover:shadow-md transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <div className="bg-purple-100 p-1.5 rounded-full">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                  </div>
                  Premium Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  Get priority assistance and support from our team whenever you need help.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withOrgAccess(JoinPage, { allowGuest: true });