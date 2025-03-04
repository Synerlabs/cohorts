'use client';

import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ServerCrash } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AffiliationItem from './affiliation-item';
import { OrganizationMembershipView } from '@/types/database.types';

export interface AffiliationsListProps {
  parentOrganizations: OrganizationMembershipView[];
  childOrganizations: OrganizationMembershipView[];
  organizationId: string;
  orgSlug: string;
}

export default function AffiliationsList({
  parentOrganizations,
  childOrganizations,
  organizationId,
  orgSlug
}: AffiliationsListProps) {
  const [activeTab, setActiveTab] = useState('hosts');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteSuccess = () => {
    // In a real implementation, you might want to refresh the data
    // For now, we'll rely on the server component to refresh on navigation
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Connections</CardTitle>
      </CardHeader>
      <Tabs defaultValue="hosts" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hosts">
              Host Organizations ({parentOrganizations.length})
            </TabsTrigger>
            <TabsTrigger value="members">
              Member Organizations ({childOrganizations.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isLoading && !error && (
            <>
              <TabsContent value="hosts" className="space-y-4 mt-0">
                {parentOrganizations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No host organizations</p>
                ) : (
                  parentOrganizations.map((org) => (
                    <AffiliationItem 
                      key={org.id}
                      affiliation={org}
                      type="parent"
                      orgSlug={orgSlug}
                      onDelete={handleDeleteSuccess}
                    />
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="members" className="space-y-4 mt-0">
                {childOrganizations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No member organizations</p>
                ) : (
                  childOrganizations.map((org) => (
                    <AffiliationItem 
                      key={org.id}
                      affiliation={org}
                      type="child"
                      orgSlug={orgSlug}
                      onDelete={handleDeleteSuccess}
                    />
                  ))
                )}
              </TabsContent>
            </>
          )}
        </CardContent>
      </Tabs>
    </Card>
  );
} 