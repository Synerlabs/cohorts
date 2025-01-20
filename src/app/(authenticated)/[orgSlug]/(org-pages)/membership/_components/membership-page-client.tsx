"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm from "./membership-form";
import MembershipTable from "./membership-table";
import { useState } from "react";
import { IMembershipTierProduct } from "@/lib/types/product";

interface MembershipPageClientProps {
  tiers: IMembershipTierProduct[];
  groupId: string;
}

export default function MembershipPageClient({ tiers, groupId }: MembershipPageClientProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Membership Tiers</h2>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Tier
            </Button>
          </SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Create Membership Tier</SheetTitle>
            </SheetHeader>
            <div className="mt-4 pb-6">
              <MembershipForm 
                groupId={groupId} 
                onSuccess={() => setOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="rounded-md border">
        <MembershipTable tiers={tiers} groupId={groupId} />
      </div>
    </div>
  );
} 