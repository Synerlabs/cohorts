import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

interface XenditSettingsProps {
  orgId: string;
  enabled: boolean;
  isConnected: boolean;
  accountStatus?: {
    isActive: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    hasExternalAccount: boolean;
    requirementsDueDate?: string;
    disabledReason?: string;
  };
  onToggle: (enabled: boolean) => Promise<void>;
}

export function XenditSettings({
  orgId,
  enabled,
  isConnected,
  accountStatus,
  onToggle
}: XenditSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTestOptions, setShowTestOptions] = useState(false);
  const { toast } = useToast();

  // Calculate completion progress
  useEffect(() => {
    if (!accountStatus) {
      setProgress(0);
      return;
    }

    let completedSteps = 0;
    const totalSteps = 4;

    if (accountStatus.isActive) completedSteps++;
    if (accountStatus.chargesEnabled) completedSteps++;
    if (accountStatus.payoutsEnabled) completedSteps++;
    if (accountStatus.hasExternalAccount) completedSteps++;

    setProgress(Math.round((completedSteps / totalSteps) * 100));
  }, [accountStatus]);

  const handleToggle = async () => {
    try {
      setLoading(true);
      await onToggle(!enabled);
      toast({
        title: enabled ? 'Xendit payments disabled' : 'Xendit payments enabled',
        description: enabled 
          ? 'Your organization will no longer accept Xendit payments.' 
          : 'Your organization can now accept Xendit payments.'
      });
    } catch (error) {
      console.error('Error toggling Xendit:', error);
      toast({
        title: 'Error',
        description: 'Failed to update Xendit settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      
      // Redirect to Xendit onboarding page
      const response = await fetch('/api/payments/xendit/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create connection URL');
      }
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error connecting to Xendit:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Failed to connect to Xendit. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectTestAccount = async () => {
    try {
      setLoading(true);
      
      // Use the test mode to create a direct connection
      const response = await fetch('/api/payments/xendit/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, testMode: true })
      });
      
      if (!response.ok) {
        throw new Error('Failed to connect test account');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Test Account Connected',
          description: 'Xendit test account connected successfully.'
        });
        
        // Refresh the page to see updated status
        window.location.reload();
      } else {
        throw new Error(data.message || 'Failed to connect test account');
      }
    } catch (error) {
      console.error('Error connecting test account:', error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Failed to connect test account. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderConnectButton = () => {
    return (
      <div className="space-y-4">
        <Button 
          onClick={handleConnect} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Connecting..." : "Connect Xendit Account"}
        </Button>
        
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setShowTestOptions(!showTestOptions)}
            size="sm"
          >
            {showTestOptions ? "Hide Test Options" : "Show Test Options"}
          </Button>
        </div>
        
        {showTestOptions && (
          <div className="space-y-2 p-4 border rounded bg-muted/30">
            <h4 className="text-sm font-medium">Developer Testing Options</h4>
            <p className="text-xs text-muted-foreground">These options are only for development and testing.</p>
            <Button 
              onClick={handleConnectTestAccount} 
              disabled={loading} 
              variant="secondary" 
              size="sm"
              className="w-full"
            >
              Connect Test Account (Skip Verification)
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Xendit Payments</CardTitle>
          <div className="flex items-center gap-2">
            <Switch
              id="xendit-enabled"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={loading || !isConnected}
            />
            <Label htmlFor="xendit-enabled">
              {enabled ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Account Status</Label>
                {accountStatus?.isActive ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
              
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${accountStatus?.chargesEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Charges Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${accountStatus?.payoutsEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Payouts Enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${accountStatus?.hasExternalAccount ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span>Bank Account Connected</span>
                </div>
              </div>
            </div>
            
            {accountStatus?.disabledReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Account Issue</AlertTitle>
                <AlertDescription>{accountStatus.disabledReason}</AlertDescription>
              </Alert>
            )}
            
            {accountStatus?.requirementsDueDate && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Please complete your account verification by {new Date(accountStatus.requirementsDueDate).toLocaleDateString()}.
                </AlertDescription>
              </Alert>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              Connect your Xendit account to start accepting payments with automatic splits between your organization and the platform.
            </p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end border-t pt-4">
        {isConnected ? (
          <div className="space-x-4">
            <Button
              variant="outline"
              onClick={() => window.open('https://dashboard.xendit.co', '_blank')}
            >
              Open Xendit Dashboard
            </Button>
            {renderConnectButton()}
          </div>
        ) : (
          renderConnectButton()
        )}
      </CardFooter>
    </Card>
  );
} 