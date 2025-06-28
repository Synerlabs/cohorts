'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, Eye, EyeOff, Bug } from 'lucide-react';
import { completeAccountSetup } from '@/actions/auth.actions';
import { DebugProfileUpdate } from './debug-profile-update';

interface AccountSetupFormProps {
  userId: string;
  orgSlug?: string;
  inviteToken?: string;
}

export function AccountSetupForm({ userId, orgSlug, inviteToken }: AccountSetupFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showDebugTools, setShowDebugTools] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Store the user ID in localStorage as a backup in case cookies fail
  useEffect(() => {
    if (userId) {
      try {
        localStorage.setItem('sb_session_id', userId);
        console.log('Stored user ID in localStorage for backup');
      } catch (e) {
        console.error('Failed to store user ID in localStorage:', e);
      }
    }
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    // Clear password error when user types
    if (e.target.name === 'password' || e.target.name === 'confirmPassword') {
      setPasswordError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started', { 
      hasInviteToken: !!inviteToken, 
      userId, 
      orgSlug 
    });
    
    // Validate inputs
    if (!formData.firstName || !formData.lastName) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate password
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setDebugInfo(null);
    
    try {
      // If we have an invite token, we need to handle it differently
      if (inviteToken) {
        console.log('Processing invite token during account setup:', inviteToken.substring(0, 8) + '...');
        
        // The user doesn't have a session yet, so we need to use the invite token to complete signup
        try {
          // Call your invitation acceptance API endpoint
          console.log('Calling accept-invitation API');
          setDebugInfo('Sending invitation acceptance request...');
          
          const response = await fetch('/api/accept-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: inviteToken,
              firstName: formData.firstName,
              lastName: formData.lastName,
              password: formData.password,
            }),
          });
          
          console.log('Got API response', { 
            status: response.status, 
            ok: response.ok 
          });
          
          setDebugInfo(`API Response: ${response.status} ${response.ok ? 'OK' : 'Failed'}`);
          
          // Capture response body for debugging even if not OK
          let responseBody: {
            message?: string;
            userId?: string;
            orgSlug?: string;
          } | undefined;
          
          try {
            responseBody = await response.json();
            console.log('Response body:', responseBody);
            setDebugInfo(prev => `${prev}\nResponse: ${JSON.stringify(responseBody)}`);
          } catch (parseError) {
            console.error('Error parsing response:', parseError);
            setDebugInfo(prev => `${prev}\nError parsing response`);
          }
          
          if (!response.ok) {
            throw new Error(
              responseBody?.message || 
              `Failed to accept invitation (Status: ${response.status})`
            );
          }
          
          toast({
            title: 'Success',
            description: 'Your account has been created successfully!',
          });
          
          // Redirect to login page with a success message
          if (responseBody?.orgSlug) {
            router.push(`/login?message=Account+setup+complete&redirect=/@${responseBody.orgSlug}`);
          } else if (orgSlug) {
            router.push(`/login?message=Account+setup+complete&redirect=/@${orgSlug}`);
          } else {
            router.push('/login?message=Account+setup+complete');
          }
          return;
        } catch (error: any) {
          console.error('Error accepting invitation:', error);
          setDebugInfo(prev => `${prev}\nError: ${error.message}`);
          
          toast({
            title: 'Error',
            description: error.message || 'Failed to complete setup. Please try again.',
            variant: 'destructive',
          });
          
          setIsSubmitting(false);
          return;
        }
      }
      
      // Standard account setup flow - user already has a session
      console.log('Processing standard account setup');
      setDebugInfo('Processing standard account setup...');
      
      // Use server action to handle Supabase operations
      const setupResult = await completeAccountSetup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password
      });
      
      console.log('Account setup server action result:', setupResult);
      setDebugInfo(prev => `${prev}\nServer response: ${JSON.stringify(setupResult)}`);
      
      if (!setupResult.success) {
        console.warn('Server action failed, attempting client-side fallback');
        setDebugInfo(prev => `${prev}\nServer action failed: ${setupResult.error}\nAttempting client-side fallback...`);
        
        // Try client-side fallback
        const supabase = createClient();
        
        // Create a timeout promise to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Client fallback: Password update timed out. Please try again.'));
          }, 5000); // 5 second timeout
        });
        
        try {
          // Try password update
          const passwordResult = await Promise.race([
            supabase.auth.updateUser({ password: formData.password }),
            timeoutPromise
          ]) as { error: any };
          
          if (passwordResult.error) {
            throw new Error(`Client fallback: Failed to set password: ${passwordResult.error.message}`);
          }
          
          setDebugInfo(prev => `${prev}\nClient password update successful`);
          
          // Try profile update
          const profileResult = await Promise.race([
            supabase.from('profiles').upsert({
              id: userId,
              first_name: formData.firstName,
              last_name: formData.lastName,
              updated_at: new Date().toISOString(),
            }),
            timeoutPromise
          ]) as { error: any };
          
          if (profileResult.error) {
            throw new Error(`Client fallback: Failed to update profile: ${profileResult.error.message}`);
          }
          
          setDebugInfo(prev => `${prev}\nClient profile update successful`);
        } catch (fallbackError: any) {
          console.error('Client-side fallback failed:', fallbackError);
          setDebugInfo(prev => `${prev}\nClient fallback failed: ${fallbackError.message}`);
          throw new Error(`Account setup failed: ${setupResult.error}. Fallback attempt also failed: ${fallbackError.message}`);
        }
      }
      
      toast({
        title: 'Success',
        description: 'Your account setup is complete!',
      });

      // Redirect to the org page if a slug was provided
      if (orgSlug) {
        router.push(`/@${orgSlug}`);
        return;
      }
      
      // Try to get the referrer to redirect back to the org page if possible
      try {
        const referrer = document.referrer;
        if (referrer && referrer.includes('/@')) {
          const url = new URL(referrer);
          const pathParts = url.pathname.split('/');
          const orgSlugIndex = pathParts.findIndex(part => part.startsWith('@'));
          
          if (orgSlugIndex >= 0) {
            router.push(pathParts[orgSlugIndex]);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing referrer:', error);
      }
      
      // Fallback to the home page
      router.push('/');
    } catch (error: any) {
      console.error('Error in account setup process:', error);
      
      // Log more detailed error info
      const errorInfo = {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500), // Trim stack trace for readability
        cause: error.cause,
        code: error.code,
        details: error.details
      };
      
      console.error('Detailed error:', errorInfo);
      setDebugInfo(prev => `${prev}\nCritical error: ${error.message}\nError type: ${error.name}\nCode: ${error.code || 'none'}`);
      
      toast({
        title: 'Error',
        description: error.message || 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Set Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1"
                />
                <button 
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{passwordError}</span>
              </div>
            )}
            
            {/* Display debug info if available */}
            {debugInfo && (
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap">
                <p className="font-semibold mb-1">Debug Info:</p>
                {debugInfo}
              </div>
            )}
            
            {/* Debug tools toggle */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowDebugTools(!showDebugTools)}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600"
              >
                <Bug className="h-3 w-3" />
                {showDebugTools ? 'Hide' : 'Show'} Debug Tools
              </button>
            </div>
            
            {/* Debug component */}
            {showDebugTools && (
              <DebugProfileUpdate 
                userId={userId} 
                firstName={formData.firstName || 'Test First'} 
                lastName={formData.lastName || 'Test Last'}
              />
            )}
          </div>
          
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Completing Setup...' : 'Complete Setup'}
          </Button>
          
          {/* Support section */}
          <div className="mt-4 pt-4 border-t text-sm text-center text-muted-foreground">
            <p>Having trouble? Try these tips:</p>
            <ul className="mt-2 text-xs list-disc list-inside text-left">
              <li>Make sure your password is at least 6 characters</li>
              <li>Reload the page if the form is unresponsive</li>
              <li>Check your internet connection</li>
            </ul>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 