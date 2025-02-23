"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import MembershipForm from "./membership-form";
import MembershipTable from "./membership-table";
import MembershipsTable from "./memberships-table";
import { useState } from "react";
import { IMembershipTierProduct } from "@/lib/types/product";
import { IMembership } from "@/lib/types/membership";
import { permissions } from "@/lib/types/permissions";
import { ClientComponentPermission } from "@/components/ClientComponentPermission";
import { usePermissions } from "@/lib/hooks/use-permissions";

interface MembershipPageClientProps {
  tiers: IMembershipTierProduct[];
  memberships: IMembership[];
  groupId: string;
  orgSlug: string;
  userPermissions: string[];
}

export default function MembershipPageClient({ tiers, memberships, groupId, orgSlug }: MembershipPageClientProps) {
  const [open, setOpen] = useState(false);
  const { hasPermission } = usePermissions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Memberships</h2>
        {hasPermission(permissions.memberships.create) && (
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
        )}
      </div>

      <Tabs defaultValue={hasPermission(permissions.memberships.create) ? "tiers" : "memberships"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
        </TabsList>

        <TabsContent value="memberships" className="space-y-4">
          <div className="rounded-md border">
            <MembershipsTable memberships={memberships} />
          </div>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-4">
          {tiers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No membership tiers found. <ClientComponentPermission requiredPermissions={[permissions.memberships.create]}>Create a tier to start accepting members.</ClientComponentPermission>
                <ClientComponentPermission requiredPermissions={[permissions.memberships.create]} invert>Contact an administrator to create membership tiers.</ClientComponentPermission>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <MembershipTable tiers={tiers} groupId={groupId} slug={orgSlug} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 