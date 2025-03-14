'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
  
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedOrgId('');
  };
  
  const handleSelectExisting = () => {
    setIsCreatingNew(false);
    setNewOrgName('');
  };
  
  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validate input
    if (!isCreatingNew && !selectedOrgId) {
      toast({
        title: "Error",
        description: "Please select an organization",
        variant: "destructive"
      });
      return;
    }
    
    if (isCreatingNew && !newOrgName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an organization name",
        variant: "destructive"
      });
      return;
    }
    
    if (!tierId) {
      toast({
        title: "Error",
        description: "Missing tier information",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare form data with organization info
      let formDataWithOrgInfo = {};
      
      if (isCreatingNew) {
        console.log(`Creating new organization: ${newOrgName}`);
        formDataWithOrgInfo = { 
          _organizationInfo: { 
            createNew: true, 
            name: newOrgName.trim() 
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
      
      // Submit the application
      const response = await fetch(`/api/memberships/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tierProductId: tierId,
          formSubmission: formDataWithOrgInfo,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Error creating application:', result);
        throw new Error(result.error || 'Failed to submit application');
      }
      
      // Show success toast
      toast({
        title: "Success",
        description: "Your affiliation request has been submitted",
        variant: "default"
      });
      
      // Redirect to memberships page
      router.push(`/${orgSlug}/memberships`);
      
    } catch (error) {
      console.error('Error in submission:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoBack = () => {
    router.back();
  };
  
  return (
    <div className="container max-w-2xl py-10">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={handleGoBack}
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
          {isLoading ? (
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
                <Label htmlFor="newOrgName">Organization Name</Label>
                <Input
                  id="newOrgName"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Enter organization name"
                  autoFocus
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
                disabled={organizations.length === 0}
              >
                <Building className="mr-2 h-4 w-4" />
                Select Existing Organization
              </Button>
              
              {organizations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You don't have any eligible organizations to select.
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
                    You don't have any organizations that can be affiliated with this one. 
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
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Organization
              </Button>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2 pt-6">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isSubmitting || 
              (isCreatingNew && !newOrgName.trim()) || 
              (!isCreatingNew && !selectedOrgId && organizations.length > 0)
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 