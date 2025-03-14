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
import { useTransition, useState, useEffect, useRef } from "react";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { join } from "../_actions/join";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Check, Loader2, Sparkles, Plus, Building, Clock, ClipboardCheck, AlertCircle } from "lucide-react";
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
import { ShieldCheck } from "lucide-react";

interface Organization {
  id: string;
  name: string;
}

interface OrganizationSelectionProps {
  tier: IMembershipTierProduct;
  groupId: string;
  userId: string;
}

// Define a type for our debug info object
interface DebugInfo {
  userGroups: string[];
  ownedGroups: Array<{id: string; name: string}>;
  filteredGroups: any[];
  currentGroupId: string;
  filteringSteps: any[];
  finalOrgs: any[];
  affiliations: {
    asParent: any[];
    asChild: any[];
    combinedAffiliationIds: string[];
  };
  tiers: any[];
  error?: string;
  permissionIssue?: boolean;
  tier?: any;
  apiResponse?: any;
  usingApi?: boolean;
  suggestApiEndpoint?: boolean;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

export function OrganizationSelection({ tier, groupId, userId }: OrganizationSelectionProps) {
  const [isPending, startTransition] = useTransition();
  const [state, action] = useToastActionState(join);
  const router = useRouter();
  const { toast } = useToast();
  
  // Organization selection state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debug mode
  const [debugMode, setDebugMode] = useState(false);

  // Currency symbol
  const currencySymbol = tier.currency ? 
    (currencySymbols[tier.currency as Currency] || '$') : 
    '$';

  // Handle redirect if provided in state
  useEffect(() => {
    if (state?.redirect) {
      router.push(state.redirect);
    }
  }, [state?.redirect, router]);

  // Load user's organizations on component mount
  useEffect(() => {
    const loadOrganizations = async () => {
      console.log('Starting to load organizations for user:', userId);
      setIsLoading(true);
      setError(null);
      
      try {
        const supabase = createClient();
        console.log('Supabase client created, querying group_user table');
        
        // Get organizations owned by the user
        const { data: groupsOwned, error: groupsError } = await supabase
          .from('group_user')
          .select('group:group_id(id, name)')
          .eq('user_id', userId)
          .eq('role', 'owner');
        
        console.log('Query completed, raw results:', groupsOwned);
        
        if (groupsError) {
          console.error('Supabase query error:', groupsError);
          throw groupsError;
        }
        
        if (!groupsOwned || groupsOwned.length === 0) {
          console.log('No organizations found for this user');
          setOrganizations([]);
          setIsCreatingNew(true);
          return;
        }
        
        // Filter out the current group (can't affiliate with self)
        const filteredOrgs = groupsOwned
          .map(item => {
            // Safely typecast the group object
            const group = item.group as any;
            return { 
              id: group?.id, 
              name: group?.name 
            } as Organization;
          })
          .filter(org => org.id !== groupId);
        
        console.log('Processed organizations:', filteredOrgs);
        setOrganizations(filteredOrgs);
        
        // Automatically switch to "Create New" if no organizations exist
        if (filteredOrgs.length === 0) {
          console.log('No valid organizations after filtering, switching to create new');
          setIsCreatingNew(true);
        } else {
          console.log(`Found ${filteredOrgs.length} valid organizations`);
        }
      } catch (error: any) {
        console.error('Error loading organizations:', error);
        const errorMessage = error?.message || 'Unknown error';
        setError(`Failed to load your organizations: ${errorMessage}`);
        toast({
          title: "Failed to load organizations",
          description: "We couldn't retrieve your organizations. Creating a new one instead.",
          variant: "destructive",
        });
        // Default to creating new on error
        setIsCreatingNew(true);
      } finally {
        setIsLoading(false);
        console.log('Organization loading completed');
      }
    };
    
    if (userId) {
      loadOrganizations();
    } else {
      console.warn('No userId provided, cannot load organizations');
    }
    
    // Enable debug mode with keyboard shortcut
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'd') {
        console.log('Debug mode toggled');
        setDebugMode(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userId, groupId, toast]);

  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedOrgId('');
  };
  
  const handleSelectExisting = () => {
    setIsCreatingNew(false);
    setNewOrgName('');
  };

  const handleSubmit = async () => {
    if (isCreatingNew && !newOrgName) {
      setError('Please enter an organization name');
      return;
    }
    
    if (!isCreatingNew && !selectedOrgId) {
      setError('Please select an organization');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.set('membershipTierId', tier.id);
      formData.set('groupId', groupId);
      formData.set('userId', userId);
      
      // Add organization information
      if (isCreatingNew) {
        formData.set('organizationName', newOrgName);
      } else {
        formData.set('organizationId', selectedOrgId);
        // Find the organization name from the selected ID
        const org = organizations.find(o => o.id === selectedOrgId);
        if (org) {
          formData.set('organizationName', org.name);
        }
      }
      
      startTransition(() => {
        action(formData);
      });
    } catch (error) {
      console.error('Error submitting organization:', error);
      setError('Failed to submit organization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-muted/80 relative">
      {/* Premium corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
        <div className="absolute rotate-45 bg-gradient-to-r from-primary/70 to-primary w-16 h-4 -top-2 right-0"></div>
      </div>
      
      {/* Header with Gradient Accent */}
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60"></div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-xl md:text-2xl">
                {tier.name}
              </CardTitle>
              {tier.price === 0 && (
                <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">
                  Free
                </Badge>
              )}
            </div>
            {tier.description && (
              <CardDescription className="mt-1 text-sm max-w-md">
                {tier.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price section with improved styling */}
        <div className="flex items-baseline bg-gradient-to-r from-slate-50 to-transparent p-4 rounded-lg border border-slate-200">
          <div className="text-3xl md:text-4xl font-bold">
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
        
        {/* Activation Process Card */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 py-2 px-4">
            <h4 className="text-sm font-medium flex items-center">
              <Check className="h-4 w-4 mr-2 text-primary" />
              Activation Process
            </h4>
          </div>
          
          <div className="p-4 text-sm">
            {tier.membership_tier?.activation_type === 'automatic' && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 bg-emerald-100 text-emerald-600 p-1 rounded-full">
                  <Check className="h-3 w-3" />
                </div>
                <p className="text-slate-700">Your organization will be automatically affiliated after submission.</p>
              </div>
            )}
            {tier.membership_tier?.activation_type === 'review_required' && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 bg-amber-100 text-amber-600 p-1 rounded-full">
                  <Clock className="h-3 w-3" />
                </div>
                <p className="text-slate-700">An administrator will review your organization affiliation request.</p>
              </div>
            )}
            {tier.membership_tier?.activation_type === 'form_required' && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 bg-blue-100 text-blue-600 p-1 rounded-full">
                  <ClipboardCheck className="h-3 w-3" />
                </div>
                <p className="text-slate-700">You'll need to complete an organization information form.</p>
              </div>
            )}
            {(tier.membership_tier?.activation_type === 'form_then_payment' ||
              tier.membership_tier?.activation_type === 'form_then_review') && (
              <div className="flex items-start gap-2">
                <div className="mt-0.5 bg-purple-100 text-purple-600 p-1 rounded-full">
                  <ClipboardCheck className="h-3 w-3" />
                </div>
                <p className="text-slate-700">This affiliation requires a form submission and additional steps.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Features section */}
        <div className="space-y-3 p-4 bg-indigo-50 bg-opacity-50 rounded-lg border border-indigo-100">
          <h4 className="text-sm font-medium flex items-center text-indigo-800">
            <ShieldCheck className="h-4 w-4 mr-2 text-indigo-600" />
            Organization Benefits
          </h4>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Official affiliation with {tier.name}</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Access to organization-specific resources</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Cross-promotion opportunities</span>
            </li>
          </ul>
        </div>
        
        {/* Action Button or Organization Selection */}
        <div className="border-t pt-5 mt-6">
          <label className="text-base font-medium block mb-3">Select your organization:</label>
          
          <div className="bg-gradient-to-b from-slate-50 to-transparent rounded-lg p-5 mb-6 space-y-5 border border-slate-200">
            {/* Select Existing or Create New Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button 
                variant={isCreatingNew ? "outline" : "default"} 
                size="sm"
                className={`flex items-center justify-center py-5 ${!isCreatingNew ? "bg-primary hover:bg-primary/90 shadow-sm" : "hover:border-primary/30 border-slate-200"}`}
                onClick={handleSelectExisting}
                disabled={isLoading || organizations.length === 0}
              >
                <Building className="h-4 w-4 mr-2" />
                <span className="font-medium">
                  {isLoading ? (
                    <span className="flex items-center">
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Loading...
                    </span>
                  ) : (
                    "Existing Organization"
                  )}
                </span>
                {!isLoading && organizations.length === 0 && (
                  <span className="ml-1 text-xs opacity-70">(None found)</span>
                )}
              </Button>
              <Button 
                variant={isCreatingNew ? "default" : "outline"} 
                size="sm"
                className={`flex items-center justify-center py-5 ${isCreatingNew ? "bg-primary hover:bg-primary/90 shadow-sm" : "hover:border-primary/30 border-slate-200"}`}
                onClick={handleCreateNew}
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="font-medium">Create New</span>
              </Button>
            </div>
            
            {/* Input for selected option */}
            {isCreatingNew ? (
              <div className="space-y-3">
                <Label htmlFor="new-org-name" className="text-sm font-medium">Organization Name</Label>
                <Input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Enter your organization name"
                  className="w-full border-slate-200 focus:border-primary"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  A new organization will be created with this name. You'll be the admin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label htmlFor="org-select" className="text-sm font-medium">Choose Organization</Label>
                {isLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="h-8 w-8 mb-2 animate-spin text-primary/70" />
                    <p>Loading your organizations...</p>
                  </div>
                ) : (
                  <>
                    <Select 
                      value={selectedOrgId} 
                      onValueChange={setSelectedOrgId}
                      disabled={organizations.length === 0}
                    >
                      <SelectTrigger id="org-select" className="w-full bg-white border-slate-200 focus:border-primary">
                        <SelectValue placeholder="Select an organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            No organizations found
                          </div>
                        ) : (
                          organizations.map((org) => (
                            <SelectItem key={org.id} value={org.id} className="py-2">
                              {org.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {organizations.length === 0 && (
                      <div className="flex flex-col items-center p-4 mt-2 bg-amber-50 rounded-lg border border-amber-100">
                        <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                        <p className="text-sm text-amber-700 mb-1 text-center font-medium">No Organizations Available</p>
                        <p className="text-xs text-amber-600 text-center mb-3">You don't have any organizations yet.</p>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700" 
                          onClick={handleCreateNew}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Create a New Organization Instead
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
            onClick={handleSubmit}
            disabled={isPending || isSubmitting || (isCreatingNew ? !newOrgName : !selectedOrgId)}
          >
            {(isPending || isSubmitting) ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Building className="mr-2 h-5 w-5" />
            )}
            {isCreatingNew ? "Create & Affiliate Organization" : "Affiliate Organization"}
          </Button>
          
          {/* Show error message if any */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Debug Message - only shown in debug mode */}
      {debugMode && (
        <div className="mt-4 mx-6 mb-6 p-3 bg-orange-100 border border-orange-200 rounded text-sm">
          <div className="font-semibold">Debug Information:</div>
          <div>Selected Org ID: {selectedOrgId || 'none'}</div>
          <div>New Org Name: {newOrgName || 'none'}</div>
          <div>Is Creating New: {isCreatingNew ? 'yes' : 'no'}</div>
          <div>User ID: {userId || 'not set'}</div>
          <div>Group ID: {groupId || 'not set'}</div>
          <div>Tier ID: {tier.id || 'not set'}</div>
          <div>Loading state: {isLoading ? 'loading' : 'complete'}</div>
          <div>Organizations found: {organizations.length}</div>
          {error && (
            <div className="mt-2 p-2 bg-red-100 rounded">
              <div className="font-semibold text-red-700">Error:</div>
              <div className="text-red-600">{error}</div>
            </div>
          )}
          <div className="mt-2">
            <button 
              onClick={() => console.log('Current organizations:', organizations)}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
            >
              Log Orgs to Console
            </button>
          </div>
        </div>
      )}
    </Card>
  );
} 