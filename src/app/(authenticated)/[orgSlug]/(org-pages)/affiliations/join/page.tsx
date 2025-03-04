import { redirect } from 'next/navigation';
import { OrgAccessHOCProps, withOrgAccess } from '@/lib/hoc/org';
import { permissions } from '@/lib/types/permissions';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getOrgBySlug } from '@/services/org.service';
import { Heading } from '@/components/ui/heading';
import JoinForm from '../_components/join-form';

interface JoinOrganizationPageProps extends OrgAccessHOCProps {}

async function JoinOrganizationPage({ org, userPermissions }: JoinOrganizationPageProps) {
  // Get the organization details
  const { data: organization } = await getOrgBySlug(org.slug);
  
  if (!organization) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/@${org.slug}/affiliations`} className="hover:opacity-75 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <Heading as="h2">Join {organization.name}</Heading>
          <p className="text-muted-foreground mt-1">
            Request to become an affiliate of this organization
          </p>
        </div>
      </div>
      
      <JoinForm
        hostOrganization={organization}
        orgSlug={org.slug}
      />
    </div>
  );
}

export default withOrgAccess(JoinOrganizationPage, {
  permissions: [permissions.group.edit],
  onAccessDenied: {
    action: "redirect",
    redirectTo: "/dashboard"
  }
}); 