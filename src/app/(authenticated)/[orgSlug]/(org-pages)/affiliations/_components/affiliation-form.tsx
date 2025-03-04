'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter,
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, Network } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { createOrganizationMembershipAction } from '@/server/actions/organization-membership.actions';

interface AffiliationFormProps {
  orgSlug: string;
  organizationId: string;
  initialData?: any; // Replace with proper type
  isEditing?: boolean;
  onSuccess?: () => void;
}

// Form schema for validation
const affiliationSchema = z.object({
  memberOrganizationId: z.string().min(1, 'Member organization is required'),
  membershipTierId: z.string().min(1, 'Membership tier is required'),
  metadata: z.record(z.any()).optional(),
});

export default function AffiliationForm({
  orgSlug,
  organizationId,
  initialData,
  isEditing = false,
  onSuccess
}: AffiliationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    memberOrganizationId: initialData?.memberOrganizationId || '',
    membershipTierId: initialData?.membershipTierId || '',
    metadata: initialData?.metadata || {},
  });

  // Loading state for related data
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoadingMembershipTiers, setIsLoadingMembershipTiers] = useState(false);
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);

  // Load related data on component mount
  useEffect(() => {
    const loadRelatedData = async () => {
      // In a real implementation, you would fetch these from your API
      // For now, using placeholder data
      setOrganizations([
        { id: '123e4567-e89b-12d3-a456-426614174000', name: 'National Association', slug: 'national-association' },
        { id: '223e4567-e89b-12d3-a456-426614174001', name: 'Regional Chapter', slug: 'regional-chapter' },
        { id: '323e4567-e89b-12d3-a456-426614174002', name: 'Local Group', slug: 'local-group' },
      ]);
      
      setMembershipTiers([
        { id: 'tier-1', name: 'Basic Membership', description: 'Basic membership with limited benefits' },
        { id: 'tier-2', name: 'Premium Membership', description: 'Premium membership with additional benefits' },
        { id: 'tier-3', name: 'Gold Membership', description: 'Gold membership with full benefits' },
      ]);
    };
    
    loadRelatedData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    try {
      affiliationSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string[]> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          if (!errors[field]) {
            errors[field] = [];
          }
          errors[field].push(err.message);
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Create membership with current org as host and selected org as member
      const result = await createOrganizationMembershipAction(
        orgSlug,
        {
          host_organization_id: organizationId,
          member_organization_id: formData.memberOrganizationId,
          membership_tier_id: formData.membershipTierId,
          metadata: formData.metadata,
        }
      );
      
      if (result.error) {
        setError(result.error);
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/@${orgSlug}/affiliations`);
          router.refresh();
        }
      }
    } catch (err) {
      console.error('Error submitting affiliation:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get membership tier description
  const getMembershipTierDescription = (tierId: string) => {
    const tier = membershipTiers.find(t => t.id === tierId);
    return tier?.description || 'Defines the benefits and restrictions of this membership.';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>{isEditing ? 'Edit' : 'Create'} Affiliation</CardTitle>
            <CardDescription>
              Connect your organization with another organization through membership
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="space-y-6">
            {/* Member Organization field */}
            <div className="space-y-2">
              <Label htmlFor="memberOrganizationId">Organization <span className="text-red-500">*</span></Label>
              <Select
                disabled={isSubmitting}
                value={formData.memberOrganizationId}
                onValueChange={(value) => handleSelectChange('memberOrganizationId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.memberOrganizationId && (
                <p className="text-sm text-red-500">{validationErrors.memberOrganizationId[0]}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Select the organization you want to establish a membership with
              </p>
            </div>

            {/* Membership Tier field */}
            <div className="space-y-2">
              <Label htmlFor="membershipTierId">Membership Tier <span className="text-red-500">*</span></Label>
              <Select
                disabled={isSubmitting}
                value={formData.membershipTierId}
                onValueChange={(value) => handleSelectChange('membershipTierId', value)}
              >
                <SelectTrigger>
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
              {validationErrors.membershipTierId && (
                <p className="text-sm text-red-500">{validationErrors.membershipTierId[0]}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {getMembershipTierDescription(formData.membershipTierId)}
              </p>
            </div>
          </div>

          <CardFooter className="flex justify-end gap-3 px-0 pt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Membership
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
} 