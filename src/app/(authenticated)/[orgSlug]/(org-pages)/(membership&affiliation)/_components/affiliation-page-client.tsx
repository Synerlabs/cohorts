import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Building2, Plus } from "lucide-react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { IMembershipTierProduct } from "@/lib/types/product";
import { IMembership } from "@/lib/types/membership";
import SubscriptionPlansCards from "./subscription-plans-cards";
import MembershipsTable from "./memberships-table";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SubscriptionPlanSelection from "./subscription-plan-selection";
import MembershipForm, { MembershipFormType } from "./membership-form";
import { permissions } from "@/lib/types/permissions";

interface AffiliationPageClientProps {
  tiers: IMembershipTierProduct[];
  memberships: IMembership[];
  groupId: string;
  orgSlug: string;
  userPermissions: string[];
  currentFilter?: 'all' | 'membership' | 'organization';
}

export default function AffiliationPageClient({ 
  tiers, 
  memberships, 
  groupId, 
  orgSlug, 
  userPermissions,
  currentFilter = 'organization'
}: AffiliationPageClientProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MembershipFormType | null>(null);
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  
  // Get current tab and filter from URL params
  const activeTab = searchParams.get('tab') || 'tiers';
  const filter = searchParams.get('filter') || 'organization';
  
  // Instead of local state & fetching, now we just navigate
  const handleFilterChange = (filter: string) => {
    startTransition(() => {
      // Create new URL with the filter parameter
      const params = new URLSearchParams(searchParams);
      if (filter === 'all') {
        params.delete('filter');
      } else {
        params.set('filter', filter);
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === 'tiers') {
        params.delete('tab');
      } else {
        params.set('tab', value);
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSelectType = (type: MembershipFormType) => {
    setOpen(true);
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

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-card">
          <TabsTrigger value="tiers">Subscription Plans</TabsTrigger>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
        </TabsList>
        
        <TabsContent value="memberships">
          <MembershipsTable memberships={memberships} />
        </TabsContent>
        
        <TabsContent value="tiers">
          <div className="mb-4 border-b pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <Tabs value={filter} onValueChange={handleFilterChange} className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
                  <TabsTrigger value="membership" className="text-xs h-7 px-3 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Memberships
                  </TabsTrigger>
                  <TabsTrigger value="organization" className="text-xs h-7 px-3 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Organizations
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {isPending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent className="flex-grow py-2 px-4 space-y-3">
                    <Skeleton className="h-7 w-28 mb-4" />
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pt-0 pb-4">
                    <Skeleton className="h-9 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : tiers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-muted/20">
              <div className="text-center max-w-md">
                <div className="bg-primary/10 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {filter === 'all' 
                    ? "No subscription plans yet" 
                    : filter === 'membership' 
                      ? "No membership plans yet" 
                      : "No organization plans yet"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {filter === 'all' 
                    ? "Create your first subscription plan to start accepting members or affiliated organizations." 
                    : filter === 'membership' 
                      ? "Create your first membership plan to start accepting members." 
                      : "Create your first affiliation plan to start accepting affiliated organizations."}
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