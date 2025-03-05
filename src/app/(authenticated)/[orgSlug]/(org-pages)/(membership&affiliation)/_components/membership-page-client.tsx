"use client";

import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import MembershipForm, { MembershipFormType } from "./membership-form";
import SubscriptionPlansCards from "./subscription-plans-cards";
import MembershipsTable from "./memberships-table";
import { useState } from "react";
import { IMembershipTierProduct } from "@/lib/types/product";
import { IMembership } from "@/lib/types/membership";
import { permissions } from "@/lib/types/permissions";
import { ClientComponentPermission } from "@/components/ClientComponentPermission";
import { usePermissions } from "@/lib/hooks/use-permissions";
import SubscriptionPlanSelection from "./subscription-plan-selection";

interface MembershipPageClientProps {
  tiers: IMembershipTierProduct[];
  memberships: IMembership[];
  groupId: string;
  orgSlug: string;
  userPermissions: string[];
}

export default function MembershipPageClient({ tiers, memberships, groupId, orgSlug, userPermissions }: MembershipPageClientProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MembershipFormType | null>(null);
  const { hasPermission } = usePermissions();

  const handleSelectType = (type: MembershipFormType) => {
    setSelectedType(type);
  };

  const handleClose = (open: boolean) => {
    setOpen(open);
    // Only reset selected type when closing the sheet
    if (!open) {
      setTimeout(() => {
        setSelectedType(null);
      }, 300); // Short delay to ensure the transition completes before resetting
    }
  };

  console.log("CLIENT MEMBERSHIPS", memberships);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Memberships & Affiliations</h2>
        {hasPermission(permissions.memberships.create) && (
          <Sheet open={open} onOpenChange={handleClose}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Subscription Plan
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto md:max-w-2xl sm:max-w-full">
              <SheetHeader>
                <SheetTitle>
                  {selectedType === null 
                    ? "Create Subscription Plan" 
                    : selectedType === MembershipFormType.MEMBER 
                      ? "Create Membership Plan" 
                      : "Create Affiliation Plan"}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 pb-6">
                {selectedType === null ? (
                  <SubscriptionPlanSelection 
                    onSelect={handleSelectType} 
                    onClose={handleClose} 
                  />
                ) : (
                  <MembershipForm 
                    groupId={groupId} 
                    onSuccess={() => handleClose(false)}
                    type={selectedType}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      <Tabs defaultValue={hasPermission(permissions.memberships.create) ? "tiers" : "memberships"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="tiers">Subscription Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="memberships" className="space-y-4">
          <div className="rounded-md border">
            <MembershipsTable memberships={memberships} />
          </div>
        </TabsContent>

        <TabsContent value="tiers">
          {tiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-muted/20">
              <div className="text-center max-w-md">
                <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No subscription plans yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first subscription plan to start accepting members or affiliated organizations.
                </p>
                {hasPermission(permissions.memberships.create) && (
                  <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Subscription Plan
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <SubscriptionPlansCards tiers={tiers} groupId={groupId} slug={orgSlug} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 