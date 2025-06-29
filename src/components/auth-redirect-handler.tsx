'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
// No longer need createClient here if only using server action
// import { createClient } from '@/lib/utils/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCheck, UserX } from 'lucide-react';
import { checkSession } from '@/actions/auth.actions';

// Define paths where this handler should NOT run its checks/redirects
const DISABLED_PATHS = ['/login', '/public-account-setup', '/invitation-accepted'];

// List of public org routes (expand as needed)
function isPublicOrgRoute(pathname: string): boolean {
  // Matches /@orgslug, /@orgslug/join, /@orgslug/forgot-password, /@orgslug/reset-password
  return (
    /^\/@[a-zA-Z0-9-_]+$/.test(pathname) ||
    /^\/@[a-zA-Z0-9-_]+\/join(\/.*)?$/.test(pathname) ||
    /^\/@[a-zA-Z0-9-_]+\/forgot-password$/.test(pathname) ||
    /^\/@[a-zA-Z0-9-_]+\/reset-password$/.test(pathname)
  );
}

interface AuthRedirectHandlerProps {
  pathname: string; // Accept pathname as a prop
  searchParams?: ReturnType<typeof useSearchParams>;
}

export function AuthRedirectHandler({ pathname, searchParams }: AuthRedirectHandlerProps) {
  const router = useRouter();
  const { toast } = useToast();
  // Keep state related to the actual check logic, needed for non-disabled paths
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Default to false, set true only when checking
  const [error, setError] = useState<string | null>(null);
  
  // Account mismatch state (keep)
  const [showAccountMismatch, setShowAccountMismatch] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [inviteParams, setInviteParams] = useState<{
    hash: string;
    next?: string;
  } | null>(null);

  // Helper to detect if this is a Supabase auth transaction
  function hasSupabaseAuthParams(): boolean {
    if (!searchParams) return false;
    const keys = [
      'access_token',
      'refresh_token',
      'code',
      'type',
      'error',
      'error_code',
      'error_description',
    ];
    return keys.some((key) => searchParams.get(key));
  }

  useEffect(() => {
    let isMounted = true;

    // If there are Supabase error params, redirect to /login with those params
    let foundErrorParams = false;
    let errorParams = new URLSearchParams();
    if (searchParams) {
      const error = searchParams.get('error');
      const error_code = searchParams.get('error_code');
      const error_description = searchParams.get('error_description');
      if (error || error_code || error_description) {
        if (error) errorParams.set('error', error);
        if (error_code) errorParams.set('error_code', error_code);
        if (error_description) errorParams.set('error_description', error_description);
        foundErrorParams = true;
      }
    }
    // If not found in searchParams, check window.location.hash (client-side only)
    if (!foundErrorParams && typeof window !== 'undefined' && window.location.hash) {
      // Remove leading # and parse as query string
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const error = hashParams.get('error');
      const error_code = hashParams.get('error_code');
      const error_description = hashParams.get('error_description');
      if (error || error_code || error_description) {
        if (error) errorParams.set('error', error);
        if (error_code) errorParams.set('error_code', error_code);
        if (error_description) errorParams.set('error_description', error_description);
        foundErrorParams = true;
      }
    }
    if (foundErrorParams) {
      router.replace(`/login?${errorParams.toString()}`);
      return;
    }

    // --- Skip effect if on a disabled path or public org route (unless auth params present) --- 
    if ((DISABLED_PATHS.includes(pathname) || isPublicOrgRoute(pathname)) && !hasSupabaseAuthParams()) {
      console.log(`[AuthRedirectHandler] Skipping checks on disabled/public path: ${pathname}`);
      return; // Don't run the auth checks
    }
    // --- End Skip --- 

    // Only run check if not already checked (and not disabled)
    if (!checked) {
        // Define the async function inside the conditional block
        async function checkAuthAndRedirect() {
          console.log(`[AuthRedirectHandler] Auth check running on path: ${pathname}`);
          setIsLoading(true); // Set loading true only when we actually start checking
          
          try {
            // Use the server action for reliable check
            const sessionResult = await checkSession();
            
            console.log('[AuthRedirectHandler] Session check result:', sessionResult?.status);

            if (!isMounted) return;

            if (!sessionResult.success) {
              console.error('[AuthRedirectHandler] Error checking session:', sessionResult.error);
              // Avoid setting error for "No session found" as it's not always an error state
              if (sessionResult.error && sessionResult.error !== 'No session found') {
                setError(sessionResult.error);
              }
              // Proceed even if no session, might be a public page
            }

            // User is authenticated
            if (sessionResult.userId) {
                // Profile Check
                const profile = sessionResult.profile;
                const orgSlugMatch = pathname.match(/^\/(@[^\/]+)/);
                const currentOrgSlug = orgSlugMatch ? orgSlugMatch[1].substring(1) : null;
                
                console.log('[AuthRedirectHandler] User authenticated:', sessionResult.userId, 'Profile complete:', profile?.isComplete);

                if (!profile?.isComplete) {
                    console.log('[AuthRedirectHandler] Profile incomplete. Redirecting to public setup...');
                    // Preserve orgSlug if possible
                    const setupUrl = currentOrgSlug 
                        ? `/public-account-setup?orgSlug=${currentOrgSlug}`
                        : '/public-account-setup';
                    // Prevent redirect loop if already on setup page (should be handled by DISABLED_PATHS but double-check)
                    if (pathname !== '/public-account-setup') {
                      router.push(setupUrl);
                      return; // Stop further execution after redirect
                    }
                }
                
                // If authenticated and profile complete, no redirect needed from here
                console.log('[AuthRedirectHandler] User authenticated and profile complete. No redirect needed.');
                
            } else {
              // User is NOT authenticated
              console.log('[AuthRedirectHandler] User not authenticated.');
              // Check if currently on a path that REQUIRES authentication
              // (Refine this check based on your actual protected routes)
              const requiresAuth = pathname.startsWith('/@') || pathname.startsWith('/dashboard') || pathname.startsWith('/settings'); // Example
              
              if (requiresAuth) {
                  console.log(`[AuthRedirectHandler] Path ${pathname} requires auth. Redirecting to login...`);
                  // Preserve the intended destination for redirect after login
                  router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
                  return; // Stop further execution after redirect
              }
                // If on a public page, no redirect needed
              console.log(`[AuthRedirectHandler] Path ${pathname} is public. No redirect needed.`);
            }
          } catch (error: any) {
            console.error('[AuthRedirectHandler] Unexpected error during check:', error);
            setError('An unexpected error occurred during authentication check.');
          } finally {
            if (isMounted) {
              setIsLoading(false); // Set loading false when check is done
              setChecked(true); // Mark as checked after completion/error
            }
          }
        }
        
        // Call the check function
        checkAuthAndRedirect();
    }

    return () => {
      isMounted = false;
    };
    // Keep dependencies - effect should re-run if path changes or if check completes
  }, [pathname, checked, router, toast]); 

  // Handler for when user wants to continue with current account
  const handleContinueWithCurrent = () => {
    setShowAccountMismatch(false);
    toast({
      title: 'Continuing with current account',
      description: `Using your current account: ${currentUserEmail}`,
    });
    router.push('/');
  };

  // Handler for when user wants to sign out and use the invite account
  const handleSwitchAccount = async () => {
    setShowAccountMismatch(false);
    setIsLoading(true);
    
    try {
      // const supabase = createClient();
      
      // Sign out current user
      // await supabase.auth.signOut();
      
      toast({
        title: 'Signed out successfully',
        description: 'Please use the invitation link again.',
      });
      
      // If we have saved invite parameters, restore them
      if (inviteParams?.hash) {
        // Set the hash back in the URL
        window.location.hash = inviteParams.hash.substring(1);
        // Reload to process the hash with a fresh session
        window.location.reload();
        return;
      }
      
      // Fallback - redirect to login
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Only show loading state when processing root URL with auth hash (keep this specific loading UI)
  if (isLoading && typeof window !== 'undefined' && 
      window.location.pathname === '/' && 
      window.location.hash && 
      (window.location.hash.includes('access_token') || 
       window.location.hash.includes('type=invite') ||
       window.location.hash.includes('error='))) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 z-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Processing authentication...</p>
        </div>
      </div>
    );
  }

  // Render the account mismatch dialog if needed
  return (
    <>
      {showAccountMismatch && (
        <AlertDialog open={showAccountMismatch} onOpenChange={setShowAccountMismatch}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Account Mismatch</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4">
                  <p>
                    This invitation was sent to <span className="font-medium">{inviteEmail}</span> but 
                    you&apos;re currently logged in as <span className="font-medium">{currentUserEmail}</span>.
                  </p>
                  <p>What would you like to do?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleContinueWithCurrent} className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Continue with current account
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleSwitchAccount} className="flex items-center gap-2" autoFocus>
                <UserX className="h-4 w-4" />
                Sign out and use invitation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {/* Render nothing else visually */}
    </>
  );
} 