'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { completeAccountSetup } from '@/actions/auth.actions';

interface DebugProfileUpdateProps {
  userId: string;
  firstName: string;
  lastName: string;
}

export function DebugProfileUpdate({ userId, firstName, lastName }: DebugProfileUpdateProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [apiResult, setApiResult] = useState<any>(null);
  
  const testServerAction = async () => {
    setIsLoading(true);
    try {
      const result = await completeAccountSetup(userId, {
        firstName,
        lastName,
        password: 'Temporary123' // Dummy password for test
      });
      
      setResult(result);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };
  
  const testProfileApi = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/debug-account-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          firstName, 
          lastName 
        })
      });
      
      const data = await response.json();
      setApiResult(data);
    } catch (error) {
      setApiResult({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="mt-4 p-3 border border-red-300 bg-red-50 rounded">
      <h3 className="text-sm font-semibold text-red-700 mb-2">Debug Tools (Admin Only)</h3>
      <div className="flex flex-col gap-2">
        <div className="text-xs text-gray-700">
          <div>User ID: {userId}</div>
          <div>Name: {firstName} {lastName}</div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs border-red-300"
            onClick={testServerAction}
            disabled={isLoading}
          >
            Test Server Action
          </Button>
          
          <Button 
            size="sm" 
            variant="outline" 
            className="text-xs border-red-300"
            onClick={testProfileApi}
            disabled={isLoading}
          >
            Test Debug API
          </Button>
        </div>
        
        {result && (
          <div className="mt-2">
            <div className="text-xs font-semibold">Server Action Result:</div>
            <pre className="text-xs bg-white p-1 rounded mt-1 overflow-auto max-h-20">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        {apiResult && (
          <div className="mt-2">
            <div className="text-xs font-semibold">Debug API Result:</div>
            <pre className="text-xs bg-white p-1 rounded mt-1 overflow-auto max-h-20">
              {JSON.stringify(apiResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 