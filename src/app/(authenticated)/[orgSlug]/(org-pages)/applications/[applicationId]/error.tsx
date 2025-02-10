'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ApplicationError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="p-4 space-y-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error.message || 'An error occurred while loading the application details.'}
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-center gap-4">
        <Button
          onClick={() => window.location.href = './applications'}
          variant="outline"
        >
          Back to Applications
        </Button>
        <Button onClick={reset}>
          Try Again
        </Button>
      </div>
    </div>
  );
} 