import { OrganizationAffiliationServiceStatic } from "@/services/organization-affiliation.service";
import { GroupService } from "@/services/group.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PlusCircle, 
  Users, 
  Building2, 
  Clock,
  CheckCircle2,
  XCircle,
  Network
} from "lucide-react";
import { OrganizationTiersList } from "./OrganizationTiersList";

interface HostAffiliationsProps {
  orgSlug: string;
}

export async function HostAffiliations({ orgSlug }: HostAffiliationsProps) {
  // Get current organization
  const cleanSlug = orgSlug.startsWith('@') ? orgSlug.substring(1) : orgSlug;
  const group = await GroupService.getGroupBySlug(cleanSlug);

  if (!group) {
    return <div>Organization not found</div>;
  }

  // Get statistics
  const tiers = await OrganizationAffiliationServiceStatic.getTiers({ hostGroupId: group.id });
  const affiliations = await OrganizationAffiliationServiceStatic.getHostOrganizationAffiliations({ 
    hostGroupId: group.id 
  });
  
  const activeAffiliations = affiliations.filter(a => a.status === 'active');
  const tierCount = tiers?.length || 0;
  const affiliateCount = activeAffiliations?.length || 0;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Network className="mr-2 h-4 w-4" />
              Organization Tiers
            </CardTitle>
            <CardDescription>
              Affiliation options you offer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tierCount}</div>
            <p className="text-sm text-muted-foreground">
              {tierCount === 0 
                ? "Create your first tier to start accepting affiliates" 
                : `You have ${tierCount} tier${tierCount === 1 ? '' : 's'} available`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <Building2 className="mr-2 h-4 w-4" />
              Affiliate Organizations
            </CardTitle>
            <CardDescription>
              Organizations affiliated with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliateCount}</div>
            <p className="text-sm text-muted-foreground">
              {affiliateCount === 0 
                ? "No affiliates yet" 
                : `You have ${affiliateCount} active affiliate${affiliateCount === 1 ? '' : 's'}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content tabs */}
      <Tabs defaultValue="tiers" className="w-full">
        <TabsList>
          <TabsTrigger value="tiers">Organization Tiers</TabsTrigger>
          <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tiers" className="pt-4">
          <OrganizationTiersList hostGroupId={group.id} />
        </TabsContent>
        
        <TabsContent value="affiliates" className="pt-4">
          {affiliateCount === 0 ? (
            <div className="text-center py-8">
              <h3 className="font-medium text-lg">No Affiliates Yet</h3>
              <p className="text-muted-foreground">
                Organizations that join your tiers will appear here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Affiliate cards would go here */}
              <p>Affiliates list will be shown here</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="applications" className="pt-4">
          <div className="text-center py-8">
            <h3 className="font-medium text-lg">No Pending Applications</h3>
            <p className="text-muted-foreground">
              When organizations apply to join your tiers, they'll appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
 