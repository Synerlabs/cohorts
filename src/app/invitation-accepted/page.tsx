'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function InvitationAcceptedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [authProcessed, setAuthProcessed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>(['Initialization started']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showManualResetForm, setShowManualResetForm] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setFormError('Email is required');
      return;
    }
    
    if (!password) {
      setFormError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      const supabase = createClient();
      
      // First try to update password directly (works if user is already authenticated)
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setDebugInfo(prev => [...prev, `Update password failed: ${error.message}, sending password reset email`]);
        
        // If updating fails, send a password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname + (searchParams.get('orgSlug') ? `?orgSlug=${searchParams.get('orgSlug')}` : '')
        });
        
        if (resetError) {
          setFormError(`Could not send password reset email: ${resetError.message}`);
          setIsSubmitting(false);
          return;
        }
        
        // Password reset email sent successfully
        setFormError(null);
        setDebugInfo(prev => [...prev, `Password reset email sent to ${email}`]);
        
        // Show success message
        setIsSubmitting(false);
        setAuthProcessed(false); // Hide the form
        setError(`A password reset link has been sent to ${email}. Please check your email and click the link to set your password.`);
        return;
      }
      
      // Password update successful, user is now signed in
      setDebugInfo(prev => [...prev, `Password set successfully for ${data.user?.email}`]);
      
      // Redirect to account setup page with org slug
      const orgSlug = searchParams.get('orgSlug');
      const redirectUrl = orgSlug
        ? `/public-account-setup?orgSlug=${encodeURIComponent(orgSlug)}`
        : '/public-account-setup';
        
      router.replace(redirectUrl);
    } catch (e: any) {
      setFormError(`Unexpected error: ${e.message || e}`);
      setIsSubmitting(false);
    }
  };
  
  const handleRequestNewResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setFormError('Email is required to send a reset link');
      return;
    }
    
    setIsSubmitting(true);
    setFormError(null);
    
    try {
      const supabase = createClient();
      
      // Generate new reset link
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname + (searchParams.get('orgSlug') ? `?orgSlug=${searchParams.get('orgSlug')}` : '')
      });
      
      if (resetError) {
        setFormError(`Could not send password reset email: ${resetError.message}`);
        setIsSubmitting(false);
        return;
      }
      
      // Password reset email sent successfully
      setDebugInfo(prev => [...prev, `New password reset email sent to ${email}`]);
      setError(`A new password reset link has been sent to ${email}. Please check your email and click the link to set your password.`);
      setIsSubmitting(false);
      setShowManualResetForm(false);
    } catch (e: any) {
      setFormError(`Unexpected error: ${e.message || e}`);
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    // Get orgSlug from query params to pass it along
    const orgSlug = searchParams.get('orgSlug');
    const supabase = createClient();
    
    setDebugInfo(prev => [...prev, 
      `URL Parameters: ${window.location.search}`,
      `Hash: ${window.location.hash ? 'Present' : 'Not present'}`
    ]);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Create a direct function to handle auth initialization
    const processAuth = async () => {
      try {
        setDebugInfo(prev => [...prev, 'Starting auth check']);
        
        // First check if we already have a session (the invitation link may have already authenticated)
        const { data: initialSession } = await supabase.auth.getSession();
        
        if (initialSession?.session) {
          setDebugInfo(prev => [
            ...prev, 
            `Already authenticated. User ID: ${initialSession.session.user.id}`,
            `User email: ${initialSession.session.user.email || 'not available'}`
          ]);
          
          // We're already authenticated, so show password reset form
          if (initialSession.session.user.email) {
            setEmail(initialSession.session.user.email);
          }
          
          // Clear any safety timeout once we transition to the password form
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setIsLoading(false);
          setAuthProcessed(true);
          return;
        }
        
        // Process URL parameters (we might have a code to exchange)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const type = url.searchParams.get('type'); // Check if it's specifically a recovery link
        const hashPresent = typeof window !== 'undefined' && window.location.hash && 
                (window.location.hash.includes('access_token') || window.location.hash.includes('error'));
        
        setDebugInfo(prev => [...prev, 
          `URL code parameter: ${code ? 'Present' : 'Not present'}`,
          `URL type parameter: ${type || 'Not present'}`
        ]);
        
        if (code) {
          setDebugInfo(prev => [...prev, `Auth code detected, processing...`]);
          
          // Exchange the code for a session
          const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (codeError) {
            setDebugInfo(prev => [...prev, `Code exchange error: ${codeError.message} (${codeError.status})`]);
            setError(`Error processing authentication: ${codeError.message}`);
            setIsLoading(false);
            
            // Get email from URL if available
            const emailParam = searchParams.get('email');
            if (emailParam) {
              setEmail(emailParam);
              setDebugInfo(prev => [...prev, `Pre-filled email from URL parameter: ${emailParam}`]);
            }
            
            // Show manual reset option
            setShowManualResetForm(true);
            
            // Clear any safety timeout once we show the manual reset form
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            
            return;
          }
          
          if (codeData?.session) {
            setDebugInfo(prev => [
              ...prev, 
              `Authentication successful. User ID: ${codeData.session.user.id}`,
              `User email: ${codeData.session.user.email || 'not available'}`
            ]);
            
            // Set email from session
            if (codeData.session.user.email) {
              setEmail(codeData.session.user.email);
            }
            
            // Clear any safety timeout once we show the password form
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            
            setIsLoading(false);
            setAuthProcessed(true);
            return;
          }
        } else if (hashPresent) {
          setDebugInfo(prev => [...prev, 'Hash fragment detected, waiting for client-side processing']);
          
          // Allow the hash to be processed by the client library
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if we have a session now
          const { data: finalSession } = await supabase.auth.getSession();
          
          if (finalSession?.session) {
            setDebugInfo(prev => [
              ...prev, 
              `Session established after hash processing. User ID: ${finalSession.session.user.id}`,
              `User email: ${finalSession.session.user.email || 'not available'}`
            ]);
            
            // Set email from session
            if (finalSession.session.user.email) {
              setEmail(finalSession.session.user.email);
            }
            
            // Clear any safety timeout once we show the password form
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            
            setIsLoading(false);
            setAuthProcessed(true);
            return;
          } else {
            setDebugInfo(prev => [...prev, 'Hash processing did not establish a session']);
          }
        } else {
          setDebugInfo(prev => [...prev, 'No authentication parameters detected in URL']);
        }
        
        // If we reached here, no valid reset token was found
        setDebugInfo(prev => [...prev, 'No valid authentication found']);
        
        // Try to extract the email from the URL parameters to pre-fill the form
        const emailParam = searchParams.get('email');
        if (emailParam) {
          setEmail(emailParam);
          setDebugInfo(prev => [...prev, `Pre-filled email form with: ${emailParam}`]);
        }
        
        setError('The password reset link appears to be invalid or expired. Please request a new link below.');
        setIsLoading(false);
        setShowManualResetForm(true);
        
        // Clear any safety timeout once we show the manual reset form
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
      catch (e: any) {
        setDebugInfo(prev => [...prev, `Unexpected error during auth processing: ${e.message || e}`]);
        setError('An unexpected error occurred while processing your request.');
        setIsLoading(false);
        setShowManualResetForm(true);
        
        // Clear safety timeout on error
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };
    
    // Start the auth process
    processAuth();
    
    // Add a safety timeout to ensure we don't get stuck only if we're in loading state
    // This will only trigger if the user is still on the loading screen after 15 seconds
    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        // Only proceed if we're still in loading state
        if (isLoading && !authProcessed && !showManualResetForm) {
          setDebugInfo(prev => [...prev, 'Safety timeout reached']);
          setIsLoading(false);
          setError('The process took too long to complete. Please try again or request a new password reset link.');
          setShowManualResetForm(true);
        }
      }, 15000); // Increased timeout for slow connections
    }
    
    // Cleanup timeout on component unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [router, searchParams]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4 mx-auto"></div>
          <p className="text-muted-foreground mb-4">Processing request...</p>
        </div>
      </div>
    );
  }
  
  // Render error state with manual reset option
  if (error && showManualResetForm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription className="text-red-500">
              {error}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRequestNewResetLink}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input 
                  id="reset-email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  autoComplete="email" 
                  required
                />
              </div>
              {formError && (
                <div className="text-sm text-red-500">{formError}</div>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full space-y-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send New Reset Link'}
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => router.replace('/auth/login')}
                >
                  Back to Login
                </Button>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        {/* Debug information */}
        <div className="mt-8 text-left text-xs text-gray-500 max-w-md">
          <p className="mb-2 font-medium">Debug Info:</p>
          <pre className="p-2 bg-gray-100 rounded-md overflow-auto max-h-60">
            {debugInfo.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        </div>
      </div>
    );
  }
  
  // Render basic error state
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <p className="font-bold mb-2">Notice</p>
            <p>{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.replace('/auth/login')}
            >
              Back to Login
            </Button>
          </div>
          
          {/* Debug information */}
          <div className="mt-8 text-left text-xs text-gray-500">
            <p className="mb-2 font-medium">Debug Info:</p>
            <pre className="p-2 bg-gray-100 rounded-md overflow-auto max-h-60">
              {debugInfo.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    );
  }
  
  // Render password creation form when not authenticated
  if (authProcessed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Set Your Password</CardTitle>
            <CardDescription>
              Please create a password to complete your account setup.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSetPassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  disabled={!!email} // Disable if pre-filled
                  autoComplete="email" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password" 
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password" 
                  autoComplete="new-password"
                  required
                />
              </div>
              {formError && (
                <div className="text-sm text-red-500">{formError}</div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Setting Password...' : 'Set Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {/* Debug information */}
        <div className="mt-8 text-left text-xs text-gray-500 max-w-md">
          <p className="mb-2 font-medium">Debug Info:</p>
          <pre className="p-2 bg-gray-100 rounded-md overflow-auto max-h-60">
            {debugInfo.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </pre>
        </div>
      </div>
    );
  }
  
  // Fallback render (should not happen)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="text-muted-foreground">Processing request...</p>
    </div>
  );
} 