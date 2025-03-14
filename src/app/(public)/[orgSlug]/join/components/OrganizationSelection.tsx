'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransition, useState, useEffect } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { join } from "../_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Plus, Building } from "lucide-react";
import { Currency, MembershipActivationType } from "@/lib/types/membership";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { createClient } from '@/lib/utils/supabase/client';
import { useToast } from "@/components/ui/use-toast";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSelectionProps {
  tier: IMembershipTierProduct;
  groupId: string;
  userId: string;
}

export function OrganizationSelection({ tier, groupId, userId }: OrganizationSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState(join);
  const router = useRouter();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({
    userGroups: [],
    ownedGroups: [],
    filteredGroups: [],
    currentGroupId: groupId,
    filteringSteps: [],
    finalOrgs: [],
    affiliations: {
      asParent: [],
      asChild: [],
      combinedAffiliationIds: []
    },
    tiers: []
  });
  const [showAllOrgs, setShowAllOrgs] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Load organizations the user is associated with
  useEffect(() => {
    async function fetchOrganizations() {
      const supabase = createClient();
      let activeAffiliationIds: string[] = []; // Declare here to make it available throughout function
      let parentChildAffiliations: any = [];
      let childParentAffiliations: any = [];

      try {
        console.log('============= Organization Selection Debug =============');
        console.log('User ID:', userId);
        console.log('Current organization (parent) ID:', groupId);
        console.log('Membership tier:', tier);
        
        if (!tier.membership_tier?.type || tier.membership_tier.type !== 'organization') {
          console.error('⚠️ Warning: This tier is not an organization tier:', tier);
          setDebugInfo({
            ...debugInfo,  // Keep existing default properties
            error: 'This tier is not configured as an organization tier',
            tier: tier
          });
          return;
        }
        
        // First, get all organizations where the user is a member (group_user)
        const { data: groupUsers, error: groupUsersError } = await supabase
          .from('group_users')
          .select('group_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (groupUsersError) {
          console.error('Error fetching user groups:', groupUsersError);
          return;
        }

        console.log('User is a member of these organizations:', groupUsers?.map(gu => gu.group_id) || []);
        
        // Get organizations where the user is the creator/owner
        const { data: ownedGroups, error: ownedGroupsError } = await supabase
          .from('group')
          .select('id, name')
          .eq('created_by', userId);
          
        if (ownedGroupsError) {
          console.error('Error fetching owned groups:', ownedGroupsError);
          return;
        }
        
        console.log('User owns these organizations:', ownedGroups || []);
        
        // Get user roles to find groups where they have admin permissions
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('group_role_id')
          .eq('user_id', userId)
          .eq('is_active', true);
          
        if (userRolesError) {
          console.error('Error fetching user roles:', userRolesError);
        }
        
        let adminGroupIds: string[] = [];
        
        if (userRoles && userRoles.length > 0) {
          const roleIds = userRoles.map(r => r.group_role_id);
          
          // Get group roles to determine admin roles
          const { data: groupRoles, error: groupRolesError } = await supabase
            .from('group_roles')
            .select('id, group_id, role_name, permissions')
            .in('id', roleIds);
            
          if (groupRolesError) {
            console.error('Error fetching group roles:', groupRolesError);
          } else if (groupRoles) {
            console.log('User roles:', groupRoles);
            
            // Extract group IDs where user has admin/owner role or permissions
            adminGroupIds = groupRoles
              .filter(role => 
                role.role_name.toLowerCase().includes('admin') || 
                role.role_name.toLowerCase().includes('owner') ||
                (role.permissions && (
                  role.permissions.includes('admin') || 
                  role.permissions.includes('group.admin') ||
                  role.permissions.includes('group.edit')
                ))
              )
              .map(role => role.group_id);
          }
        }
        
        console.log('Groups where user has admin roles:', adminGroupIds);
        
        // Combine all group IDs and remove duplicates
        const memberGroupIds = groupUsers ? groupUsers.map(gu => gu.group_id) : [];
        const ownerGroupIds = ownedGroups ? ownedGroups.map(g => g.id) : [];
        let allGroupIds = [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])];
        
        console.log('Initial combined group IDs:', allGroupIds);
        
        // Filter out the parent organization itself (prevent self-affiliation)
        // Users can still select their other organizations, just not the current one
        const beforeSelfFilterCount = allGroupIds.length;
        allGroupIds = allGroupIds.filter(id => id !== groupId);
        
        if (beforeSelfFilterCount > allGroupIds.length) {
          console.log(`Filtered out current organization (${groupId}) to prevent self-affiliation`);
        }
        
        if (showAllOrgs) {
          console.log('Debug mode: Showing all organizations without filtering affiliations');
          // Skip affiliation filtering
        } else {
          // Get organizations that are already affiliated with the current organization
          // Check both parent->child and child->parent relationships
          const { data: pcAffiliations, error: parentChildAffError } = await supabase
            .from('group_organization')
            .select('child_group_id, is_active')
            .eq('parent_group_id', groupId);
          
          const { data: cpAffiliations, error: childParentAffError } = await supabase
            .from('group_organization')
            .select('parent_group_id, is_active')
            .eq('child_group_id', groupId);
          
          parentChildAffiliations = pcAffiliations || [];
          childParentAffiliations = cpAffiliations || [];
          
          if (parentChildAffError) {
            console.error('Error fetching parent->child affiliations:', parentChildAffError);
          } else if (childParentAffError) {
            console.error('Error fetching child->parent affiliations:', childParentAffError);
          } else {
            console.log('Existing parent->child affiliations:', parentChildAffiliations);
            console.log('Existing child->parent affiliations:', childParentAffiliations);
            
            // Initialize activeAffiliationIds as empty array 
            
            if (parentChildAffiliations.length > 0) {
              // Get IDs of organizations that are already actively affiliated as children
              const activeChildIds = parentChildAffiliations
                .filter((rel: any) => rel.is_active)
                .map((rel: any) => rel.child_group_id);
                
              activeAffiliationIds = [...activeAffiliationIds, ...activeChildIds];
            }
            
            if (childParentAffiliations.length > 0) {
              // Get IDs of organizations that are already actively affiliated as parents
              const activeParentIds = childParentAffiliations
                .filter((rel: any) => rel.is_active)
                .map((rel: any) => rel.parent_group_id);
                
              activeAffiliationIds = [...activeAffiliationIds, ...activeParentIds];
            }
            
            if (activeAffiliationIds.length > 0) {
              console.log('Already affiliated organizations (both directions):', activeAffiliationIds);
              
              // Filter out already affiliated organizations
              const beforeAffiliationFilterCount = allGroupIds.length;
              allGroupIds = allGroupIds.filter(id => !activeAffiliationIds.includes(id));
              
              if (beforeAffiliationFilterCount > allGroupIds.length) {
                console.log(`Filtered out ${beforeAffiliationFilterCount - allGroupIds.length} already affiliated organizations`);
              }
            }
          }
        }
        
        // Debug if the group IDs list is empty after filtering
        if (allGroupIds.length === 0) {
          console.log('⚠️ User has no eligible organizations for affiliation after filtering');
          console.log('This could be because:');
          console.log('1. The user only has one organization (the current one)');
          console.log('2. All other organizations are already affiliated with this one');
          console.log('============= End Organization Selection Debug =============');
          return;
        }
        
        console.log('All eligible organization IDs after filtering:', allGroupIds);

        // Get the groups (organizations)
        const { data: orgs, error: orgsError } = await supabase
          .from('group')
          .select('id, name')
          .in('id', allGroupIds);

        if (orgsError) {
          console.error('Error fetching organizations:', orgsError);
          setDebugInfo({
            ...debugInfo,
            error: `Error fetching organizations: ${orgsError instanceof Error ? orgsError.message : String(orgsError)}`,
            userGroups: debugInfo.userGroups,
            ownedGroups: debugInfo.ownedGroups,
            finalOrgs: [],
          });
          return;
        }

        console.log('Organizations found:', orgs || []);
        console.log('============= End Organization Selection Debug =============');
        
        setOrganizations(orgs || []);
        
        // If there's only one organization, select it by default
        if (orgs && orgs.length === 1) {
          setSelectedOrgId(orgs[0].id);
        }

        // Check available tiers for the organization
        const { data: orgTiers, error: tierError } = await supabase
          .from('products')
          .select(`
            id, 
            name, 
            membership_tiers!inner(type)
          `)
          .eq('group_id', groupId)
          .filter('membership_tiers.type', 'eq', 'organization');
        
        if (tierError) {
          console.error('Error fetching organization tiers:', tierError);
        } else {
          console.log('Organization tiers available:', orgTiers);
        }

        // Set debug information
        setDebugInfo({
          userGroups: groupUsers?.map(gu => gu.group_id) || [],
          ownedGroups: ownedGroups?.map(g => ({id: g.id, name: g.name})) || [],
          adminGroups: adminGroupIds || [],
          allGroupIds: allGroupIds,
          currentGroupId: groupId,
          combinedGroups: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])],
          tier: tier,
          tiers: orgTiers || [],
          affiliations: {
            asParent: parentChildAffiliations || [],
            asChild: childParentAffiliations || [],
            combinedAffiliationIds: activeAffiliationIds
          },
          filteringSteps: [
            {
              name: "Initial organizations",
              count: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])].length,
              ids: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])]
            },
            {
              name: "After removing current org",
              count: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])].filter(id => id !== groupId).length,
              ids: [...new Set([...memberGroupIds, ...ownerGroupIds, ...adminGroupIds])].filter(id => id !== groupId),
              removed: groupId
            },
            {
              name: "After removing affiliated orgs", 
              count: allGroupIds.length,
              ids: allGroupIds,
              removedIds: activeAffiliationIds
            },
            {
              name: "Final organizations",
              count: orgs?.length || 0,
              ids: orgs?.map(o => o.id) || []
            }
          ],
          finalOrgs: orgs || []
        });
      } catch (error) {
        console.error('Error in fetchOrganizations:', error);
        setDebugInfo({
          ...debugInfo,
          error: `Error fetching organizations: ${error instanceof Error ? error.message : String(error)}`,
          userGroups: debugInfo.userGroups,
          ownedGroups: debugInfo.ownedGroups,
          finalOrgs: [],
        });
      }
    }

    fetchOrganizations();
  }, [userId, groupId, tier, showAllOrgs, refreshCounter]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    try {
      console.log('============= Submitting Organization Application =============');
      
      // Validate organization selection
      if (!isCreatingNew && !selectedOrgId) {
        console.error('No organization selected');
        setFormError('Please select an organization');
        setIsSubmitting(false);
        return;
      }

      if (isCreatingNew && !newOrgName?.trim()) {
        console.error('No organization name provided');
        setFormError('Please enter an organization name');
        setIsSubmitting(false);
        return;
      }

      // If not creating a new organization, check if the relationship already exists
      if (!isCreatingNew && selectedOrgId) {
        console.log(`Checking for existing relationship between parent (${groupId}) and child (${selectedOrgId})`);
        
        const supabase = createClient();
        
        // Check for existing relationship (active or inactive)
        const { data: existingRelationship, error: relationshipError } = await supabase
          .from('group_organization')
          .select('*')
          .eq('parent_group_id', groupId)
          .eq('child_group_id', selectedOrgId);
          
        if (relationshipError) {
          console.error('Error checking for existing relationship:', relationshipError);
          setFormError('Error checking for existing relationship');
          setIsSubmitting(false);
          return;
        }

        console.log('Existing relationship check result:', existingRelationship);
        
        if (existingRelationship && existingRelationship.length > 0) {
          // Relationship exists, determine status
          const relationship = existingRelationship[0];
          
          if (relationship.is_active) {
            console.error('Organizations are already affiliated');
            setFormError('These organizations are already affiliated');
            setIsSubmitting(false);
            return;
          } else {
            console.log('Inactive relationship exists, can proceed to reactivate');
            // Could show a message about reactivation here
          }
        } else {
          console.log('No existing relationship found, can proceed with new affiliation');
        }
      }

      // Prepare form data with organization info
      let formDataWithOrgInfo = {};
      
      if (isCreatingNew) {
        console.log(`Creating new organization: ${newOrgName}`);
        formDataWithOrgInfo = { 
          _organizationInfo: { 
            createNew: true, 
            name: newOrgName 
          }
        };
      } else {
        console.log(`Selecting existing organization: ${selectedOrgId}`);
        // Get organization name for the selected ID
        const selectedOrg = organizations.find(org => org.id === selectedOrgId);
        console.log('Selected organization details:', selectedOrg);
        
        formDataWithOrgInfo = { 
          _organizationInfo: { 
            createNew: false, 
            organizationId: selectedOrgId,
            organizationName: selectedOrg?.name
          }
        };
      }

      // Get the current URL path to extract the organization slug
      const pathSegments = window.location.pathname.split('/');
      const orgSlug = pathSegments[1]; // The slug will be the segment after the first slash

      const response = await fetch(`/api/memberships/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierProductId: tier.id,
          formSubmission: formDataWithOrgInfo,
        }),
      });

      const result = await response.json();
      console.log('API response:', result);

      if (!response.ok) {
        console.error('Error creating application:', result);
        setFormError(result.error || 'Failed to submit application');
        setIsSubmitting(false);
        return;
      }

      console.log('Application submitted successfully');
      console.log('============= End Submitting Organization Application =============');
      
      // Redirect to the membership page on success
      router.push(`/${orgSlug}/memberships`);
    } catch (error) {
      console.error('Error in submission:', error);
      setFormError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
  };

  const handleCreateConfirm = () => {
    if (!newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingNew(true);
    setSelectedOrgId('');
    setShowCreateDialog(false);
    setNewOrgName(newOrgName.trim());
  };

  // Handle redirect if provided in state
  if (state?.redirect) {
    router.push(state.redirect);
  }

  const currencySymbol = tier.currency ? 
    (currencySymbols[tier.currency as Currency] || '$') : 
    '$';

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl flex items-center justify-between">
          {tier.name}
          {tier.price === 0 && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
              Free
            </Badge>
          )}
        </CardTitle>
        {tier.description && (
          <CardDescription>{tier.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price section */}
        <div className="flex items-baseline">
          <div className="text-3xl font-bold">
            {tier.price === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <>
                {currencySymbol}
                {(tier.price / 100).toFixed(2)}
              </>
            )}
          </div>
          {tier.membership_tier?.duration_months && tier.price > 0 && (
            <div className="text-sm text-muted-foreground ml-2">
              {tier.membership_tier?.duration_months === 1
                ? "per month"
                : `for ${tier.membership_tier?.duration_months} months`}
            </div>
          )}
        </div>
        
        {/* Activation process section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium border-b pb-1">Activation Process</h4>
          <div className="text-sm text-muted-foreground space-y-2">
            {tier.membership_tier?.activation_type === MembershipActivationType.AUTOMATIC ? 'automatic' :
            tier.membership_tier?.activation_type === MembershipActivationType.REVIEW_REQUIRED ? 'review_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.PAYMENT_REQUIRED ? 'payment_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.REVIEW_THEN_PAYMENT ? 'review_then_payment' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_REQUIRED ? 'form_required' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW ? 'form_then_review' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT ? 'form_then_payment' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_PAYMENT_THEN_REVIEW ? 'form_then_payment_then_review' :
            tier.membership_tier?.activation_type === MembershipActivationType.FORM_THEN_REVIEW_THEN_PAYMENT ? 'form_then_review_then_payment' :
            'standard'}
          </div>
        </div>
        
        {/* Organization selection section */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="font-medium">Select Your Organization</h4>
          
          {organizations.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="organization">Organization</Label>
                <Select 
                  value={selectedOrgId} 
                  onValueChange={setSelectedOrgId}
                  disabled={isCreatingNew || isPending}
                >
                  <SelectTrigger id="organization">
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
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="h-px flex-1 bg-muted"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-muted"></div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCreateNew}
                disabled={isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create a New Organization
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {isCreatingNew ? (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="newOrgName">Organization Name</Label>
                  <Input
                    id="newOrgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    disabled={isPending}
                  />
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground mb-2 p-2 bg-muted rounded">
                    You don't have any eligible organizations to affiliate with this organization.
                    You can create a new organization below or ask other organizations to apply for affiliation.
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleCreateNew}
                    disabled={isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create a New Organization
                  </Button>
                </>
              )}
            </div>
          )}
          
          {isCreatingNew && organizations.length > 0 && (
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="newOrgName">New Organization Name</Label>
              <Input
                id="newOrgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter organization name"
                disabled={isPending}
              />
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Form submission button */}
      <div className="pt-6">
        {formError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-md">
            {formError}
          </div>
        )}
        <Button
          className="w-full"
          disabled={
            isPending || 
            isSubmitting || 
            (!isCreatingNew && !selectedOrgId) || 
            (isCreatingNew && !newOrgName?.trim())
          }
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Apply for Affiliation
            </>
          )}
        </Button>
      </div>
      
      {/* Create organization dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Enter the name of your organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="dialogOrgName">Organization Name</Label>
              <Input
                id="dialogOrgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter organization name"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleCreateConfirm}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {process.env.NODE_ENV !== 'production' && (
        <div className="mx-4 mb-4 p-3 border border-orange-300 bg-orange-50 rounded-md">
          <h3 className="font-semibold text-orange-800 mb-2">Debugging Information</h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-semibold">Current Organization ID:</span> {debugInfo?.currentGroupId || 'Not set'}
            </div>
            <div>
              <span className="font-semibold">Current Tier:</span> {debugInfo?.tier?.id || 'N/A'} ({debugInfo?.tier?.name || 'N/A'})
            </div>
            <div>
              <span className="font-semibold">Available Organization Tiers:</span> {debugInfo?.tiers?.length || 0} tier(s)
              <pre className="text-xs bg-gray-100 p-1 mt-1 overflow-auto">
                {JSON.stringify(debugInfo?.tiers || [], null, 2)}
              </pre>
            </div>
            <div>
              <span className="font-semibold">Affiliations:</span>
              <div className="pl-2 mt-1">
                <div><span className="font-medium">As Parent:</span> {debugInfo?.affiliations?.asParent?.length || 0}</div>
                <div><span className="font-medium">As Child:</span> {debugInfo?.affiliations?.asChild?.length || 0}</div>
                <div><span className="font-medium">Combined (filtered):</span> {debugInfo?.affiliations?.combinedAffiliationIds?.length || 0}</div>
              </div>
            </div>
            <div>
              <span className="font-semibold">User Groups:</span> {debugInfo?.userGroups?.length || 0} group(s)
              <pre className="text-xs bg-gray-100 p-1 mt-1 overflow-auto">
                {JSON.stringify(debugInfo?.userGroups || [], null, 2)}
              </pre>
            </div>
            <div>
              <span className="font-semibold">Owned Groups:</span> {debugInfo?.ownedGroups?.length || 0} group(s)
              <pre className="text-xs bg-gray-100 p-1 mt-1 overflow-auto">
                {JSON.stringify(debugInfo?.ownedGroups || [], null, 2)}
              </pre>
            </div>
            <div>
              <span className="font-semibold">Filtering Steps:</span>
              <ul className="list-disc pl-5 mt-1">
                {(debugInfo?.filteringSteps || []).map((step: any, i: number) => (
                  <li key={i} className="mb-1">
                    <span className="font-medium">{step.name}:</span> {step.count} organization(s)
                    {step.removed && <span className="block text-red-600">Removed: {step.removed}</span>}
                    {step.removedIds && step.removedIds.length > 0 && (
                      <span className="block text-red-600">Removed IDs: {JSON.stringify(step.removedIds)}</span>
                    )}
                    <pre className="text-xs bg-gray-100 p-1 mt-1 overflow-auto">
                      {JSON.stringify(step?.ids || [], null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="font-semibold">Final Organizations:</span> {debugInfo?.finalOrgs?.length || 0} group(s)
              <pre className="text-xs bg-gray-100 p-1 mt-1 overflow-auto">
                {JSON.stringify(debugInfo?.finalOrgs || [], null, 2)}
              </pre>
            </div>
            {debugInfo.error && (
              <div className="bg-red-100 border border-red-400 text-red-700 p-2 rounded-md mb-3">
                <span className="font-bold">Error:</span> {debugInfo.error}
              </div>
            )}
          </div>
        </div>
      )}

      {process.env.NODE_ENV !== 'production' && (
        <>
          <div className="mx-4 mb-4">
            <button 
              className="text-xs w-full py-1 px-2 bg-orange-200 hover:bg-orange-300 text-orange-800 rounded-md"
              onClick={() => {
                setShowAllOrgs(!showAllOrgs);
              }}
            >
              {showAllOrgs ? "Normal Mode (Filter Affiliations)" : "Debug Mode (Show All Organizations)"}
            </button>
          </div>
          <div className="mx-4 mb-4">
            <button 
              className="text-xs w-full py-1 px-2 bg-blue-200 hover:bg-blue-300 text-blue-800 rounded-md"
              onClick={() => {
                // Reset any errors
                setDebugInfo({
                  ...debugInfo,
                  error: undefined
                });
                // Force a refresh by incrementing the counter
                setRefreshCounter(prev => prev + 1);
              }}
            >
              🔄 Reload Organization Data
            </button>
          </div>
        </>
      )}
    </Card>
  );
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
}; 