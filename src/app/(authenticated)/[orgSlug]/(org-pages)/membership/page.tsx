import { getOrgBySlug } from "@/services/org.service";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm from "./_components/membership-form";
import MembershipTable from "./_components/membership-table";
import { getMembershipTiersAction } from "./_actions/membership.action";

interface MembershipPageProps {
  params: {
    orgSlug: string;
  };
}

export default async function MembershipPage({ params }: MembershipPageProps) {
  const { data: org, error } = await getOrgBySlug(params.orgSlug);

  if (error || !org) {
    notFound();
  }

  const tiers = await getMembershipTiersAction(org.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Membership Tiers</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create Membership Tier</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <MembershipForm groupId={org.id} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-md border">
        <MembershipTable tiers={tiers} groupId={org.id} />
      </div>
    </div>
  );
}
