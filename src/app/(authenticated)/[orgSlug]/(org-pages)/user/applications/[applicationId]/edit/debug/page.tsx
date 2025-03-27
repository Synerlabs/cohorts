'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/utils/supabase/client';
import { useParams } from 'next/navigation';

export default function DebugPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;
  const [application, setApplication] = useState<any>(null);
  const [formResponse, setFormResponse] = useState<any>(null);
  const [formTemplate, setFormTemplate] = useState<any>(null);
  const [groupUser, setGroupUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Get application base data
        let appBase;
        try {
          const baseResponse = await fetch(`/api/applications/${applicationId}/base`);
          if (!baseResponse.ok) {
            throw new Error(`Failed to fetch application base: ${baseResponse.status} ${baseResponse.statusText}`);
          }
          appBase = await baseResponse.json();
        } catch (err) {
          console.error('Error fetching application base:', err);
          throw new Error(err instanceof Error ? err.message : 'Failed to load application base');
        }
        
        // Get application details
        let appDetails;
        try {
          const detailsResponse = await fetch(`/api/applications/${applicationId}`);
          if (!detailsResponse.ok) {
            throw new Error(`Failed to fetch application details: ${detailsResponse.status} ${detailsResponse.statusText}`);
          }
          appDetails = await detailsResponse.json();
          setApplication(appDetails);
        } catch (err) {
          console.error('Error fetching application details:', err);
          throw new Error(err instanceof Error ? err.message : 'Failed to load application details');
        }
        
        // Get form response data
        if (appBase?.form_response_id) {
          try {
            const responseDataResponse = await fetch(`/api/form-responses/${appBase.form_response_id}`);
            if (!responseDataResponse.ok) {
              console.warn(`Form response fetch warning: ${responseDataResponse.status} ${responseDataResponse.statusText}`);
            } else {
              const responseData = await responseDataResponse.json();
              setFormResponse(responseData.formResponse);
              setFormTemplate(responseData.formTemplate);
            }
          } catch (err) {
            console.warn('Warning fetching form response:', err);
            // Don't throw here, we want to continue loading other data
          }
        }
        
        // Get group user data
        if (appDetails?.group_user_id) {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from('group_users')
              .select('*')
              .eq('id', appDetails.group_user_id)
              .single();
              
            if (data && !error) {
              // Convert to plain serializable object
              setGroupUser(JSON.parse(JSON.stringify(data)));
            } else if (error) {
              console.warn('Warning fetching group user:', error);
            }
          } catch (err) {
            console.warn('Warning fetching group user:', err);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading debug data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };
    
    if (applicationId) {
      loadData();
    }
  }, [applicationId]);

  // Helper function to safely render JSON
  const safeJsonStringify = (obj: any) => {
    try {
      return JSON.stringify(obj, (key, value) => {
        // Handle circular references and non-serializable objects
        if (typeof value === 'object' && value !== null) {
          try {
            JSON.stringify(value);
          } catch (err) {
            return '[Complex Object]';
          }
        }
        return value;
      }, 2);
    } catch (err) {
      return `Error serializing object: ${err instanceof Error ? err.message : String(err)}`;
    }
  };

  if (loading) {
    return <div>Loading debug data...</div>;
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Debug Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Application Details</h3>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                {safeJsonStringify(application)}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Group User</h3>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                {safeJsonStringify(groupUser)}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Form Template</h3>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                {safeJsonStringify(formTemplate)}
              </pre>
            </div>
            
            <div>
              <h3 className="text-lg font-medium">Form Response</h3>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                {safeJsonStringify(formResponse)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 