'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Check, ArrowLeft, Building, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { join } from '../_actions/join';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { CreateGroupForm } from '../components/CreateGroupForm';

interface Organization {
  id: string;
  name: string;
}

export default function SelectOrganizationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // Get parameters from URL
  const tierId = searchParams.get('tierId');
  const groupId = searchParams.get('groupId');
  const userId = searchParams.get('userId');
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const isFormValid = isCreatingNew 
    ? !!newOrgName.trim() 
    : !!selectedOrgId;
  const [debugMode, setDebugMode] = useState(false);
  
  // Add state for tracking when a form redirect is in progress
  const [redirectInProgress, setRedirectInProgress] = useState(false);
  
  // Server action with toast state
  const [actionState, dispatchAction, isPending] = useToastActionState(
    async (prevState: any, formData: FormData) => {
      try {
        console.log('Calling server action with data:', Object.fromEntries(formData.entries()));
        const result = await join({ 
          // Empty state object matches the expected State type
        }, formData);
        
        console.log('Server action response:', result);
        
        // If we have a redirect in the response, use it
        if (result.redirect) {
          toast({
            title: "Success",
            description: result.message || "Organization affiliation request submitted",
          });
          
          // Redirect after a short delay to allow the toast to be seen
          setTimeout(() => {
            // Use null check to satisfy TypeScript
            if (typeof result.redirect === 'string') {
              router.push(result.redirect);
            } else {
              console.error('Expected redirect URL but received:', result.redirect);
            }
          }, 1000);
        } else if (result.errors) {
          // If there are errors, display them
          throw new Error(result.errors.form?.[0] || "An error occurred");
        } else {
          // If no redirect and no errors, show success state
          setIsSuccess(true);
          toast({
            title: "Success",
            description: result.message || "Organization affiliation request submitted",
          });
          
          // Get the current URL path to extract the organization slug
          const pathSegments = window.location.pathname.split('/');
          const orgSlug = pathSegments[1];
          
          // Redirect to memberships page after a short delay
          setTimeout(() => {
            console.log(`Redirecting to /${orgSlug}/membership`);
            router.push(`/${orgSlug}/membership`);
          }, 1500);
        }
        
        return result;
      } catch (error) {
        console.error('Error in server action:', error);
        
        // Format error message to be more user-friendly
        let errorMessage = 'An unexpected error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
      }
    },
    null, // initial state
    undefined, // permalink
    {
      successTitle: "Success",
      successDescription: isCreatingNew 
        ? "New organization created and application submitted" 
        : "Organization affiliation application submitted"
    }
  );
  
  // Fetch organizations using server-side API for better permissions
  useEffect(() => {
    async function fetchOrganizations() {
      if (!userId || !groupId) {
        setError("Missing required parameters");
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/organizations/available-for-affiliation?userId=${userId}&groupId=${groupId}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Failed to fetch organizations");
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log("Organizations fetched:", data.organizations);
        setOrganizations(data.organizations || []);
        
        // Select the first organization by default if there's only one
        if (data.organizations && data.organizations.length === 1) {
          setSelectedOrgId(data.organizations[0].id);
        }
        
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setError("An unexpected error occurred while fetching organizations");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchOrganizations();
  }, [userId, groupId]);
  
  useEffect(() => {
    // Check if there's a query parameter for debug mode
    const isDebug = searchParams.get('debug') === 'true';
    if (isDebug) {
      setDebugMode(true);
      console.log("🐞 Debug mode activated");
    }
    
    // Also set debug mode with keyboard shortcut (Ctrl+Alt+D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key === 'd') {
        setDebugMode(prev => {
          const newValue = !prev;
          console.log(`🐞 Debug mode ${newValue ? 'activated' : 'deactivated'}`);
          return newValue;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchParams]);
  
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedOrgId('');
  };
  
  const handleSelectExisting = () => {
    setIsCreatingNew(false);
    setNewOrgName('');
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  // Add state for storing additional organization data
  const [newOrgData, setNewOrgData] = useState<Record<string, any>>({});
  
  // Handle organization form data update
  const handleOrgFormDataChange = (formData: Record<string, any>) => {
    setNewOrgName(formData.name || '');
    setNewOrgData(formData);
  };
  
  const handleSubmit = async () => {
    // Create a FormData object to pass to the standard join action
    const formData = new FormData();
    
    // Ensure all required fields are present
    if (!tierId || !groupId || !userId) {
      console.error('Missing required fields for membership join', { tierId, groupId, userId });
      toast({
        title: "Error",
        description: "Missing required information. Please ensure all fields are filled out.",
        variant: "destructive",
      });
      return;
    }
    
    // Now we know these values are defined - use String to force string type
    formData.append('membershipTierId', String(tierId));
    formData.append('groupId', String(groupId));
    formData.append('userId', String(userId));
    
    // Add organization-specific information
    if (isCreatingNew) {
      // For new organizations, pass the name and additional fields from the form
      formData.append('organizationName', newOrgName.trim());
      
      // Add additional group data if it exists (these will be populated by CreateGroupForm)
      if (newOrgData) {
        Object.entries(newOrgData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(`org_${key}`, String(value));
          }
        });
      }
    } else {
      // For existing organizations, pass the ID and look up the name
      formData.append('organizationId', selectedOrgId);
      
      // Find the organization name for logging
      const selectedOrg = organizations.find(org => org.id === selectedOrgId);
      if (selectedOrg) {
        formData.append('organizationName', selectedOrg.name);
      }
    }
    
    // Log the submission data
    console.log('Submitting form data:', Object.fromEntries(formData.entries()));
    
    // Set redirect in progress flag if this is likely a tier with a form
    setRedirectInProgress(true);
    
    // Call the join action
    try {
      dispatchAction(formData);
      
      // If we get here and a redirect hasn't happened after a timeout,
      // reset the flag to avoid UI being stuck in loading state
      setTimeout(() => {
        setRedirectInProgress(false);
      }, 3000);
    } catch (err) {
      setRedirectInProgress(false);
      console.error('Error in dispatchAction:', err);
    }
  };
  
  // Show pending state for both direct isPending flag and redirectInProgress
  const isProcessing = isPending || redirectInProgress;
  
  return (
    <div className="container max-w-2xl py-10">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={handleGoBack}
        disabled={isProcessing || isSuccess}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Select Organization</CardTitle>
          <CardDescription>
            Choose an existing organization or create a new one to affiliate
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isSuccess ? (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-green-800">Affiliation Request Submitted</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your request is being processed. Redirecting you to the memberships page...
              </p>
            </div>
          ) : isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Loading organizations...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 border border-red-200 bg-red-50 rounded-md text-red-700">
              <p className="font-medium">Error loading organizations</p>
              <p className="text-sm mt-1">{error}</p>
              
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          ) : isCreatingNew ? (
            <div className="space-y-4">
              <div className="flex flex-col space-y-1.5">
                <CreateGroupForm 
                  onDataChange={handleOrgFormDataChange}
                  disabled={isProcessing}
                  minimal={true}
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <div className="h-px flex-1 bg-muted"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-muted"></div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSelectExisting}
                disabled={organizations.length === 0 || isProcessing}
              >
                <Building className="mr-2 h-4 w-4" />
                Select Existing Organization
              </Button>
              
              {organizations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You don&apos;t have any eligible organizations to select.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.length > 0 ? (
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="organization">Organization</Label>
                  <Select 
                    value={selectedOrgId} 
                    onValueChange={setSelectedOrgId}
                    disabled={isProcessing}
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
              ) : (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-md text-amber-700">
                  <p className="font-medium">No eligible organizations found</p>
                  <p className="text-sm mt-1">
                    You don&apos;t have any organizations that can be affiliated with this one. 
                    This could be because you only have one organization, or all your other 
                    organizations are already affiliated.
                  </p>
                </div>
              )}
              
              <div className="flex items-center space-x-2 pt-4">
                <div className="h-px flex-1 bg-muted"></div>
                <span className="text-xs text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-muted"></div>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCreateNew}
                disabled={isProcessing}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Organization
              </Button>
            </div>
          )}
          
          {isProcessing && (
            <div className="mt-4 p-4 border border-blue-200 bg-blue-50 rounded-md">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-700">
                  {isCreatingNew 
                    ? "Creating organization and submitting affiliation request..." 
                    : "Submitting affiliation request..."}
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {redirectInProgress 
                  ? "If a form is required, you&apos;ll be redirected to complete it..."
                  : "Please wait while we process your request. This may take a few moments."}
              </p>
            </div>
          )}
          
          {debugMode && (
            <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md">
              <h3 className="text-sm font-medium text-yellow-800">🐞 Debug Mode Active</h3>
              <p className="text-xs text-yellow-700 mt-1">
                The submit button will be enabled regardless of form state.
              </p>
              <div className="mt-2 flex flex-col space-y-2 text-xs">
                <div><strong>isCreatingNew:</strong> {isCreatingNew ? 'Yes' : 'No'}</div>
                <div><strong>newOrgName:</strong> {newOrgName || '(empty)'}</div>
                <div><strong>selectedOrgId:</strong> {selectedOrgId || '(empty)'}</div>
                <div><strong>isPending:</strong> {isPending ? 'Yes' : 'No'}</div>
                <div><strong>redirectInProgress:</strong> {redirectInProgress ? 'Yes' : 'No'}</div>
                <div><strong>isSuccess:</strong> {isSuccess ? 'Yes' : 'No'}</div>
                <div><strong>Form Valid:</strong> {isFormValid ? 'Yes' : 'No'}</div>
                <div><strong>Action State:</strong> <pre className="text-xs overflow-auto max-h-20 bg-gray-100 p-1 rounded">{actionState ? JSON.stringify(actionState, null, 2) : 'null'}</pre></div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  // For the test/debug function, ensure all values are strings
                  const formData = new FormData();
                  formData.append('membershipTierId', tierId || '');
                  formData.append('groupId', groupId || '');
                  formData.append('userId', userId || '');
                  if (organizations.length > 0) {
                    formData.append('organizationId', organizations[0]?.id || '');
                    formData.append('organizationName', organizations[0]?.name || '');
                  }
                  console.log('Testing with data:', Object.fromEntries(formData.entries()));
                  dispatchAction(formData);
                }}
              >
                Test Action
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2 pt-6">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={isProcessing || isSuccess}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              // Log the click 
              console.log("🖱️ Button clicked");
              
              // Show a toast to confirm the click was recognized
              toast({
                title: "Processing",
                description: "Starting submission process..."
              });
              
              // Call handleSubmit
              handleSubmit();
            }}
            disabled={
              !debugMode && (
                isProcessing || 
                isSuccess ||
                (isCreatingNew && !newOrgName.trim()) || 
                (!isCreatingNew && !selectedOrgId && organizations.length > 0)
              )
            }
            className={`${isSuccess ? 'bg-green-600 hover:bg-green-700' : ''} ${debugMode ? 'bg-yellow-100 hover:bg-yellow-200 border-yellow-400' : ''}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Submitted
              </>
            ) : debugMode ? (
              "Debug: Force Submit"
            ) : (
              "Continue"
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {debugMode && (
        <div className="mt-4 p-4 border border-yellow-200 bg-yellow-50 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800">🐞 Debug Controls</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => {
              console.log("Displaying current state:", {
                organizations,
                selectedOrgId, 
                formValid: isFormValid,
                isPending,
                actionState
              });
              
              toast({
                title: "Debug Info",
                description: "State logged to console"
              });
            }}>
              Log State
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsSuccess(!isSuccess)}>
              Toggle Success
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDebugMode(false)}>
              Disable Debug Mode
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                // Manually force a redirect
                const pathSegments = window.location.pathname.split('/');
                const orgSlug = pathSegments[1];
                console.log(`Debug: Redirecting to /${orgSlug}/membership`);
                router.push(`/${orgSlug}/membership`);
              }}
            >
              Force Redirect
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                // Show the last server response
                const lastResponse = localStorage.getItem('lastServerResponse');
                if (lastResponse) {
                  try {
                    const data = JSON.parse(lastResponse);
                    console.log('Last server response:', data);
                    
                    toast({
                      title: "Last Response",
                      description: `Application ID: ${data.applicationId || 'None'}, Status: ${data.membershipStatus || 'Unknown'}`,
                    });
                  } catch (e) {
                    console.error('Error parsing response:', e);
                    toast({
                      title: "Error",
                      description: "Could not parse last response",
                      variant: "destructive",
                    });
                  }
                } else {
                  toast({
                    title: "No Data",
                    description: "No previous response found",
                    variant: "destructive",
                  });
                }
              }}
            >
              Show Last Response
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                // Test the server redirection
                toast({
                  title: "Server Redirect",
                  description: "The server should automatically redirect for forms. This button does nothing now.",
                });
              }}
            >
              Test Server Redirect
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 