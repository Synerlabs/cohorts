'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Building2, Info, BarChart3, ArrowRight, Edit, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils/format";
import { OrganizationTierDialog } from "./organization-tier-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface OrganizationTiersProps {
  orgId: string;
  orgSlug: string;
}

interface MembershipTier {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_months: number;
  is_active: boolean;
  total_members?: number;
  currency?: string;
}

export function OrganizationTiers({ orgId, orgSlug }: OrganizationTiersProps) {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchOrganizationTiers() {
      try {
        setLoading(true);
        const response = await fetch(`/api/organizations/${orgSlug}/membership-tiers`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch organization tiers');
        }
        
        const data = await response.json();
        setTiers(data.data || []);
      } catch (err) {
        console.error('Error fetching organization tiers:', err);
        setError('Failed to load organization tiers. Please try again later.');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load organization tiers',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizationTiers();
  }, [orgSlug, toast]);

  const handleCreateTier = () => {
    setSelectedTier(null);
    setIsDialogOpen(true);
  };

  const handleEditTier = (tier: MembershipTier) => {
    setSelectedTier(tier);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (success: boolean) => {
    setIsDialogOpen(false);
    if (success) {
      // Refresh the tiers list
      setLoading(true);
      fetch(`/api/organizations/${orgSlug}/membership-tiers`)
        .then(res => res.json())
        .then(data => {
          setTiers(data.data || []);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error refreshing tiers:', err);
          setLoading(false);
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Organization Tiers</h2>
          <p className="text-sm text-muted-foreground">
            Create and manage membership tiers for organizations that want to affiliate with you
          </p>
        </div>
        <Button onClick={handleCreateTier}>
          <Plus className="mr-2 h-4 w-4" />
          Create Organization Tier
        </Button>
      </div>

      <Separator />

      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-20 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardHeader>
            <CardTitle>No Organization Tiers</CardTitle>
            <CardDescription>
              You haven't created any tiers for organizations yet
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center p-6">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground max-w-sm">
                Create membership tiers to allow other organizations to affiliate with yours. 
                You can set different pricing, durations, and benefits.
              </p>
              <Button onClick={handleCreateTier} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Tier
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <Badge variant={tier.is_active ? "default" : "outline"}>
                    {tier.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {tier.description || "No description provided"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-3xl font-bold">{formatPrice(tier.price / 100, tier.currency || "USD")}</p>
                  <p className="text-sm text-muted-foreground">
                    {tier.duration_months === 1 
                      ? "Monthly membership" 
                      : `${tier.duration_months}-month membership`}
                  </p>
                </div>
                
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  <span>
                    {tier.total_members !== undefined 
                      ? `${tier.total_members} affiliated organization${tier.total_members !== 1 ? 's' : ''}` 
                      : "No affiliations yet"}
                  </span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleEditTier(tier)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Tier
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <OrganizationTierDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        orgId={orgId}
        tier={selectedTier}
        onSuccess={() => handleDialogClose(true)}
      />
    </div>
  );
} 