'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { 
  createRequirementAction,
  updateRequirementAction 
} from '@/server/actions/organization-requirements.actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { AlertCircle, Loader2, Building2, Network } from 'lucide-react';

interface RequirementFormProps {
  orgSlug: string;
  organizationId: string;
  initialData?: any; // Replace with proper type
  isEditing?: boolean;
  onSuccess?: () => void;
}

// Form schema for validation
const requirementSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  required_form_id: z.string().uuid().optional().nullable(),
  required_membership_tier_id: z.string().uuid().optional().nullable(),
  required_children_count: z.number().optional().nullable(),
  required_parent_relationship_type: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

export default function RequirementForm({
  orgSlug,
  organizationId,
  initialData,
  isEditing = false,
  onSuccess
}: RequirementFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Form state
  const [formData, setFormData] = useState({
    type: initialData?.type || 'form',
    title: initialData?.title || '',
    description: initialData?.description || '',
    required_form_id: initialData?.required_form_id || null,
    required_membership_tier_id: initialData?.required_membership_tier_id || null,
    required_children_count: initialData?.required_children_count || null,
    required_parent_relationship_type: initialData?.required_parent_relationship_type || null,
    is_active: initialData?.is_active ?? true,
  });

  // Loading state for related data
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  const [forms, setForms] = useState<any[]>([]);
  const [isLoadingMembershipTiers, setIsLoadingMembershipTiers] = useState(false);
  const [membershipTiers, setMembershipTiers] = useState<any[]>([]);
  const [isLoadingRelationshipTypes, setIsLoadingRelationshipTypes] = useState(false);
  const [relationshipTypes, setRelationshipTypes] = useState<any[]>([]);

  // Load related data on component mount
  useEffect(() => {
    const loadRelatedData = async () => {
      // In a real implementation, you would fetch these from your API
      // For now, using placeholder data
      setForms([
        { id: '123e4567-e89b-12d3-a456-426614174000', title: 'Application Form' },
        { id: '223e4567-e89b-12d3-a456-426614174000', title: 'Membership Form' },
      ]);
      
      setMembershipTiers([
        { id: '323e4567-e89b-12d3-a456-426614174000', name: 'Basic Membership' },
        { id: '423e4567-e89b-12d3-a456-426614174000', name: 'Premium Membership' },
      ]);
      
      setRelationshipTypes([
        { code: 'parent_child', name: 'Parent-Child' },
        { code: 'affiliate', name: 'Affiliate' },
      ]);
    };
    
    loadRelatedData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (name: string, value: string) => {
    const numberValue = value === '' ? null : parseInt(value, 10);
    setFormData(prev => ({ ...prev, [name]: numberValue }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    try {
      requirementSchema.parse(formData);
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
      const action = isEditing ? updateRequirementAction : createRequirementAction;
      const result = isEditing
        ? await action(orgSlug, initialData.id, formData, {})
        : await action(orgSlug, organizationId, formData, {});

      if (result.errors) {
        setValidationErrors(result.errors);
      } else if (result.message) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/${orgSlug}/requirements`);
          router.refresh();
        }
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        // If there are errors, set them as validation errors
        setValidationErrors(result.errors);
      } else {
        // If there's a general error, set it
        setError('Failed to save requirement. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting requirement:', err);
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Network className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>{isEditing ? 'Edit' : 'Create'} Connection Requirement</CardTitle>
            <CardDescription>
              Define what organizations must fulfill to connect with yours as chapters, affiliates, or departments
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
            {/* Type field */}
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">Requirement Type <span className="text-red-500">*</span></label>
              <Select
                disabled={isSubmitting}
                name="type"
                value={formData.type}
                onValueChange={(value) => handleSelectChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a requirement type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="membership_tier">
                    <div className="flex flex-col">
                      <span>Membership Prerequisite</span>
                      <span className="text-xs text-muted-foreground">
                        Require organizations to have a specific membership tier
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="form">
                    <div className="flex flex-col">
                      <span>Application Form</span>
                      <span className="text-xs text-muted-foreground">
                        Require organizations to complete a specific form
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="children_count">
                    <div className="flex flex-col">
                      <span>Organizational Structure</span>
                      <span className="text-xs text-muted-foreground">
                        Require organizations to have connections with other organizations
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="parent_relationship">
                    <div className="flex flex-col">
                      <span>Parent Relationship</span>
                      <span className="text-xs text-muted-foreground">
                        Require organizations to have a specific relationship with parent organizations
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.type && (
                <p className="text-sm text-red-500">{validationErrors.type[0]}</p>
              )}
              <p className="text-sm text-muted-foreground">
                Select what type of requirement organizations must meet to connect with yours
              </p>
            </div>

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">Requirement Title</label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={validationErrors.title ? 'border-red-500' : ''}
                placeholder={`e.g. "${formData.type === 'form' ? 'Complete Chapter Application' : 
                                        formData.type === 'membership_tier' ? 'Premium Tier Required' : 
                                        formData.type === 'children_count' ? 'Has Regional Chapters' : 
                                        'National Chapter Relationship'}"`}
              />
              {validationErrors.title && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.title[0]}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">Description</label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                disabled={isSubmitting}
                rows={3}
                placeholder="Explain why this requirement exists and what it means for connecting organizations"
              />
            </div>

            {/* Conditional fields based on type */}
            {formData.type === 'form' && (
              <div className="p-4 bg-muted/40 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <label htmlFor="required_form_id" className="block text-sm font-medium">Required Form</label>
                </div>
                <Select
                  value={formData.required_form_id || ''}
                  onValueChange={(value) => handleSelectChange('required_form_id', value)}
                  disabled={isSubmitting || isLoadingForms}
                >
                  <SelectTrigger id="required_form_id">
                    <SelectValue placeholder="Select a form that organizations must complete" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map(form => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Organizations must complete this form before they can connect with yours
                </p>
              </div>
            )}

            {formData.type === 'membership_tier' && (
              <div className="p-4 bg-muted/40 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <label htmlFor="required_membership_tier_id" className="block text-sm font-medium">Required Membership Tier</label>
                </div>
                <Select
                  value={formData.required_membership_tier_id || ''}
                  onValueChange={(value) => handleSelectChange('required_membership_tier_id', value)}
                  disabled={isSubmitting || isLoadingMembershipTiers}
                >
                  <SelectTrigger id="required_membership_tier_id">
                    <SelectValue placeholder="Select a membership tier that organizations must have" />
                  </SelectTrigger>
                  <SelectContent>
                    {membershipTiers.map(tier => (
                      <SelectItem key={tier.id} value={tier.id}>
                        {tier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Organizations must have this membership tier to connect with yours
                </p>
              </div>
            )}

            {formData.type === 'children_count' && (
              <div className="p-4 bg-muted/40 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <label htmlFor="required_children_count" className="block text-sm font-medium">Required Number of Connected Organizations</label>
                </div>
                <Input
                  id="required_children_count"
                  type="number"
                  min="0"
                  value={formData.required_children_count === null ? '' : formData.required_children_count}
                  onChange={(e) => handleNumberChange('required_children_count', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Organizations must have this many connections to connect with yours
                </p>
              </div>
            )}

            {formData.type === 'parent_relationship' && (
              <div className="p-4 bg-muted/40 rounded-md border">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <label htmlFor="required_parent_relationship_type" className="block text-sm font-medium">Required Relationship Type</label>
                </div>
                <Select
                  value={formData.required_parent_relationship_type || ''}
                  onValueChange={(value) => handleSelectChange('required_parent_relationship_type', value)}
                  disabled={isSubmitting || isLoadingRelationshipTypes}
                >
                  <SelectTrigger id="required_parent_relationship_type">
                    <SelectValue placeholder="Select a relationship type that organizations must have" />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipTypes.map(type => (
                      <SelectItem key={type.code} value={type.code}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Organizations must have this relationship type with their parent organization
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleCheckboxChange('is_active', checked === true)}
                disabled={isSubmitting}
              />
              <label
                htmlFor="is_active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Requirement is active
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              When inactive, this requirement won't be checked for incoming connection requests
            </p>
          </div>
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-2">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/@${orgSlug}/requirements`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditing ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            isEditing ? 'Save Changes' : 'Create Requirement'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 