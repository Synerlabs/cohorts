'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Building, ArrowRightLeft, Network } from 'lucide-react';
import RequirementItem from './requirement-item';
import { getRequirementsAction } from '@/server/actions/organization-requirements.actions';

interface RequirementsListProps {
  initialRequirements: any[]; // Replace with proper type
  organizationId: string;
  orgSlug: string;
}

// Helper function to get the display name for each requirement type category
const getCategoryTitle = (category: string) => {
  switch (category) {
    case 'MEMBERSHIP_TIER':
      return 'Membership Prerequisites';
    case 'APPLICATION_FORM':
      return 'Required Application Forms';
    case 'CONNECTED_ORGANIZATION':
      return 'Organizational Structure Requirements';
    case 'PARENT_RELATIONSHIP':
      return 'Required Relationship Types';
    default:
      return 'Other Requirements';
  }
};

export default function RequirementsList({
  initialRequirements,
  organizationId,
  orgSlug,
}: RequirementsListProps) {
  const [requirements, setRequirements] = useState<any[]>(initialRequirements);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequirements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getRequirementsAction(organizationId);
      
      if (result.error) {
        setError(result.error);
      } else if (result.requirements && result.requirements.data) {
        setRequirements(result.requirements.data);
      }
    } catch (err) {
      console.error('Error loading requirements:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh requirements when a requirement is deleted
  const handleRequirementDeleted = () => {
    loadRequirements();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4 py-8">
            <p className="text-red-600">{error}</p>
            <Button onClick={loadRequirements} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requirements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-3 py-8">
            <h3 className="text-lg font-medium">No connection requirements</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Without requirements, any organization can connect to yours as a chapter, affiliate, or department.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Group requirements by type
  const requirementsByType: Record<string, any[]> = {};
  
  requirements.forEach(req => {
    if (!requirementsByType[req.type]) {
      requirementsByType[req.type] = [];
    }
    requirementsByType[req.type].push(req);
  });

  return (
    <div className="space-y-8">
      {/* First, add a visual explainer */}
      <Card className="bg-muted/20 border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">How Connection Requirements Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-4">
              <Building className="h-10 w-10 mb-2 text-primary" />
              <h4 className="font-medium">1. Set Requirements</h4>
              <p className="text-sm text-muted-foreground">
                Define what organizations need to fulfill to connect with yours
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <ArrowRightLeft className="h-10 w-10 mb-2 text-primary" />
              <h4 className="font-medium">2. Automatic Validation</h4>
              <p className="text-sm text-muted-foreground">
                System automatically checks if organizations meet your requirements
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-4">
              <Network className="h-10 w-10 mb-2 text-primary" />
              <h4 className="font-medium">3. Build Your Network</h4>
              <p className="text-sm text-muted-foreground">
                Only qualified organizations can become chapters, affiliates, or departments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Then display requirements by type */}
      {Object.entries(requirementsByType).map(([type, reqs]) => (
        <Card key={type}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">
              {getCategoryTitle(type)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {reqs.map(requirement => (
              <RequirementItem 
                key={requirement.id}
                requirement={requirement}
                orgSlug={orgSlug}
                onDelete={handleRequirementDeleted}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 