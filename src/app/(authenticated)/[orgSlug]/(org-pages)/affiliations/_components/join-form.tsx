'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { createOrganizationMembershipAction } from '@/server/actions/organization-membership.actions';
import { Tables } from '@/lib/types/database.types';
import { Camelized } from 'humps';

// Schema for join form data
const joinFormSchema = z.object({
  membership_tier_id: z.string().uuid('Invalid membership tier ID'),
});

interface JoinFormProps {
  hostOrganization: Camelized<Tables<"group">>;
  orgSlug: string;
}

export default function JoinForm({ hostOrganization, orgSlug }: JoinFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>('');

  // Load available membership tiers
  useEffect(() => {
    const loadMembershipTiers = async () => {
      try {
        const response = await fetch(`/api/organizations/${hostOrganization.slug}/membership-tiers`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setMembershipTiers(data.data || []);
      } catch (error) {
        setError('Failed to load membership tiers');
      }
    };

    loadMembershipTiers();
  }, [hostOrganization.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate form data
      const formData = { membership_tier_id: selectedTierId };
      const validatedData = joinFormSchema.safeParse(formData);

      if (!validatedData.success) {
        setError('Please select a membership tier');
        setIsLoading(false);
        return;
      }

      // Create membership request
      const result = await createOrganizationMembershipAction(
        orgSlug,
        {
          host_organization_id: hostOrganization.id,
          member_organization_id: hostOrganization.id, // This will be the current org's ID
          membership_tier_id: selectedTierId,
        },
        { errors: {}, message: '' }
      );

      if (result.error) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      // Redirect to affiliations page on success
      router.push(`/@${orgSlug}/affiliations`);
      router.refresh();
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Join Request</CardTitle>
          <CardDescription>
            Select a membership tier to request affiliation with {hostOrganization.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="membershipTier">Membership Tier</Label>
            <Select
              value={selectedTierId}
              onValueChange={setSelectedTierId}
            >
              <SelectTrigger id="membershipTier">
                <SelectValue placeholder="Select a membership tier" />
              </SelectTrigger>
              <SelectContent>
                {membershipTiers.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading || !selectedTierId}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Join Request'
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
} 