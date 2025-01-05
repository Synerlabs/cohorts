import { RegistrationForm } from "@/app/(public)/(home)/sign-up/components/registration-form";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";

function JoinPage({ org }: OrgAccessHOCProps) {
  return <RegistrationForm orgId={org.id} />;
}

export default withOrgAccess(JoinPage, { allowGuest: true });
