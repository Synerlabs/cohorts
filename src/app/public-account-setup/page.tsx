'use client';

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/utils/supabase/client";
import { AccountSetupForm } from "@/components/account-setup/account-setup-form";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { checkSession } from "@/actions/auth.actions";

export default function PublicAccountSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDebugOptions, setShowDebugOptions] = useState(false);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const orgSlug = searchParams.get('orgSlug');
  const [authTimeoutReached, setAuthTimeoutReached] = useState(false);

  const checkProfileAndProceed = useCallback(async (sessionUserId: string) => {
    console.log(`[PublicAccountSetupPage] Session detected for user ${sessionUserId}. Checking profile status...`);
    setDebugInfo((prev) => ({ ...prev, checkProfileAttempt: { userId: sessionUserId, timestamp: new Date().toISOString() } }));
    
    try {
      const sessionResult = await checkSession();
      console.log('[PublicAccountSetupPage] Server session check result:', sessionResult?.status);
      setDebugInfo((prev) => ({ ...prev, serverSessionCheckResult: { ...sessionResult, timestamp: new Date().toISOString() } }));

      if (!sessionResult.success || !sessionResult.userId) {
        console.warn('[PublicAccountSetupPage] Server check failed or returned no user ID despite client session.');
        setError('Authentication check failed. Please try refreshing or logging in again.');
        setIsLoading(false);
        return;
      }

      if (sessionResult.userId !== sessionUserId) {
        console.warn(`[PublicAccountSetupPage] Mismatch! Client session user ID (${sessionUserId}) != Server session user ID (${sessionResult.userId}). Using server ID.`);
        sessionUserId = sessionResult.userId;
      }

      if (sessionResult.profile?.isComplete) {
        console.log('[PublicAccountSetupPage] Profile complete, redirecting...');
        const destination = orgSlug ? `/@${orgSlug}` : '/dashboard';
        router.push(destination);
      } else {
        console.log('[PublicAccountSetupPage] Profile incomplete, showing setup form.');
        setUserId(sessionUserId);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('[PublicAccountSetupPage] Error during server profile check:', error);
      setDebugInfo((prev) => ({ ...prev, serverCheckError: String(error) }));
      setError('An error occurred while checking your account status.');
      setIsLoading(false);
    }
  }, [router, orgSlug, toast]);

  useEffect(() => {
    const supabase = createClient();
    let sessionCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasHandledSession = false;

    console.log('[PublicAccountSetupPage] Setting up onAuthStateChange listener and timeout...');
    
    // Add direct cookie inspection to diagnose the issue
    if (typeof document !== 'undefined') {
      console.log('[PublicAccountSetupPage] COOKIE DEBUG - All cookies:', document.cookie);
      
      // Try direct session check with getSession() - Magic links should auto-authenticate
      supabase.auth.getSession().then(({ data }) => {
        console.log('[PublicAccountSetupPage] DIRECT SESSION CHECK:', 
          data.session ? `Found (user: ${data.session.user.id})` : 'Not found');
        
        if (data.session && !hasHandledSession) {
          console.log('[PublicAccountSetupPage] Session found via direct check, manually proceeding with userId:', data.session.user.id);
          hasHandledSession = true; // Prevent duplicate handling
          
          // Save session ID to localStorage for recovery purposes
          try {
            localStorage.setItem('sb_session_id', data.session.user.id);
            console.log('[PublicAccountSetupPage] Saved session ID to localStorage');
          } catch (e) {
            console.error('[PublicAccountSetupPage] Failed to save session ID to localStorage:', e);
          }
          
          // Clear any existing timeout
          if (sessionCheckTimeoutId) {
            clearTimeout(sessionCheckTimeoutId);
            sessionCheckTimeoutId = null;
          }
          
          // Proceed with the normal flow using the detected session
          checkProfileAndProceed(data.session.user.id);
        }
      }).catch(err => {
        console.error('[PublicAccountSetupPage] Error checking session directly:', err);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[PublicAccountSetupPage] onAuthStateChange - Event: ${event}, Has Session: ${!!session}`);
        setDebugInfo((prev) => ({
          ...prev,
          authStateChanges: [
            ...(prev.authStateChanges || []), 
            { event, hasSession: !!session, userId: session?.user?.id, timestamp: new Date().toISOString() }
          ]
        }));

        if (sessionCheckTimeoutId) {
          clearTimeout(sessionCheckTimeoutId);
          sessionCheckTimeoutId = null;
          console.log('[PublicAccountSetupPage] Auth event received, cleared timeout.');
        }
        
        if (hasHandledSession) {
            console.log(`[PublicAccountSetupPage] Session event ${event} received, but initial session already handled. Ignoring.`);
            if (event === 'SIGNED_OUT') {
                console.log('[PublicAccountSetupPage] SIGNED_OUT detected. Redirecting to login.');
                setError(null);
                setIsLoading(true);
                router.push('/login');
            }
            return; 
        }

        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          if (session?.user) {
            console.log(`[PublicAccountSetupPage] Event ${event} with user detected. Proceeding to check profile.`);
            hasHandledSession = true;
            checkProfileAndProceed(session.user.id);
          } else {
             console.warn(`[PublicAccountSetupPage] Event ${event} received but no session.user found.`);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[PublicAccountSetupPage] SIGNED_OUT detected before initial session handled. Redirecting to login.');
          hasHandledSession = true;
          setError(null);
          setIsLoading(true);
          router.push('/login');
        }
      }
    );

    sessionCheckTimeoutId = setTimeout(() => {
      if (!hasHandledSession) {
        console.warn('[PublicAccountSetupPage] Timeout waiting for auth session. No session detected.');
        setDebugInfo((prev) => ({ ...prev, authTimeout: { reached: true, timestamp: new Date().toISOString() } }));
        setAuthTimeoutReached(true);
        setError('You do not appear to be logged in. Please try accessing the invitation link again or contact your administrator.');
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      console.log('[PublicAccountSetupPage] Cleaning up auth listener and timeout.');
      subscription.unsubscribe();
      if (sessionCheckTimeoutId) {
        clearTimeout(sessionCheckTimeoutId);
      }
    };
  }, [router, checkProfileAndProceed]);

  const attemptDirectLogin = async () => {
    try {
      setDebugInfo(prev => ({...prev, manualCheckAttempt: true}));
      const result = await checkSession();
      setDebugInfo(prev => ({ ...prev, manualCheckResult: result }));
      if (result.success && result.userId) {
        setUserId(result.userId);
        setIsLoading(false);
        setError(null);
        setAuthTimeoutReached(false);
        toast({ title: "Success", description: "Successfully retrieved session via manual check" });
        if (result.profile?.isComplete) {
            const destination = orgSlug ? `/@${orgSlug}` : '/dashboard';
            router.push(destination);
        }
      } else {
        toast({ title: result.success ? "No Session" : "Error", description: result.error || "No active session found", variant: result.success ? "default" : "destructive" });
        setError(result.error || 'Manual check failed to find a session.');
      }
    } catch (e) {
      console.error("Manual login attempt error:", e);
      setDebugInfo(prev => ({...prev, manualCheckError: String(e)}));
      toast({ title: "Error", description: "Failed to check authentication status", variant: "destructive" });
      setError('Error during manual authentication check.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
        <p className="mt-4 text-muted-foreground">Verifying authentication...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-md mx-auto py-20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-red-500 mb-4">{error}</p>
          {authTimeoutReached && <p className="text-sm text-muted-foreground mb-4">It took too long to detect your session after the invitation link. This might be a temporary issue.</p>}
        </div>
        <div className="flex flex-col gap-2 items-center">
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
          <Button 
            variant="link" 
            className="text-xs text-muted-foreground mt-4"
            onClick={() => setShowDebugOptions(!showDebugOptions)}
          >
            {showDebugOptions ? 'Hide' : 'Show'} Debug Info
          </Button>
          {showDebugOptions && (
            <pre className="text-xs bg-gray-100 p-2 rounded mt-2 max-w-md overflow-auto w-full">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }
  
  if (!userId) {
    console.warn("[PublicAccountSetupPage] Reached render stage without userId, error, or loading state.");
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <p className="text-muted-foreground">Preparing account setup...</p>
        </div>
    ); 
  }
  
  return (
    <div className="container max-w-md mx-auto py-20">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold mb-2">Complete Your Account Setup</h1>
        <p className="text-muted-foreground">
          Please provide a few details to complete your account setup.
        </p>
      </div>
      <AccountSetupForm 
        userId={userId} 
        orgSlug={orgSlug || undefined} 
      />
      <div className="mt-8 flex justify-center">
           <Button 
            variant="link" 
            className="text-xs text-muted-foreground"
            onClick={() => setShowDebugOptions(!showDebugOptions)}
          >
            {showDebugOptions ? 'Hide' : 'Show'} Debug Info
          </Button>
       </div>
       {showDebugOptions && (
        <pre className="text-xs bg-gray-100 p-2 rounded mt-2 max-w-md overflow-auto mx-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  );
} 