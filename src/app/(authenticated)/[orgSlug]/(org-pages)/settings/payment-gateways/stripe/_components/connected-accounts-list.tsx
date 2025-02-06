'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ConnectedAccount {
  id: string;
  account_id: string;
  org_id: string;
  country: string;
  is_test_mode: boolean;
  is_active: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  has_external_account: boolean;
  disabled_reason?: string;
  requirements_status: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  capabilities_status: {
    card_payments?: string;
    transfers?: string;
  };
  verification_status: {
    fields_needed: string[];
    verified_fields: string[];
  };
  requirements_due_date?: string;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
}

interface ConnectedAccountsListProps {
  orgId: string;
  onAccountDeleted?: () => void;
}

function getAccountStatusDetails(account: ConnectedAccount) {
  // Helper to get badge and message for disabled reason
  function getDisabledReasonDetails(reason: string) {
    const reasonMap: Record<string, { badge: string; message: string }> = {
      'action_required.requested_capabilities': {
        badge: 'Action Required',
        message: 'Additional capabilities need to be requested for this account'
      },
      'requirements.past_due': {
        badge: 'Past Due',
        message: 'Additional verification information is required'
      },
      'requirements.pending_verification': {
        badge: 'Under Review',
        message: 'Stripe is currently verifying account information'
      },
      'rejected.fraud': {
        badge: 'Rejected',
        message: 'Account rejected due to suspected fraud or illegal activity'
      },
      'rejected.terms_of_service': {
        badge: 'Rejected',
        message: 'Account rejected due to terms of service violations'
      },
      'rejected.listed': {
        badge: 'Rejected',
        message: 'Account rejected due to prohibited persons/companies list'
      },
      'rejected.other': {
        badge: 'Rejected',
        message: 'Account rejected for other reasons'
      },
      'listed': {
        badge: 'Under Review',
        message: 'Account may be on a prohibited persons/companies list'
      },
      'under_review': {
        badge: 'Under Review',
        message: 'Account is being reviewed by Stripe'
      },
      'other': {
        badge: 'Disabled',
        message: 'Account is disabled while being reviewed'
      }
    };

    const details = reasonMap[reason] || { 
      badge: 'Disabled', 
      message: 'Account is currently disabled' 
    };

    return {
      badge: <Badge variant={reason === 'requirements.pending_verification' ? 'secondary' : 'destructive'}>
        {details.badge}
      </Badge>,
      message: details.message
    };
  }

  // Check if account is disabled or under verification
  if (account.disabled_reason) {
    const { badge, message } = getDisabledReasonDetails(account.disabled_reason);
    const severity = account.disabled_reason === 'requirements.pending_verification' ? 'warning' : 'error';
    return {
      badge,
      details: [message],
      severity
    };
  }

  // Check if account is fully active
  const isFullyActive = account.is_active && 
    account.charges_enabled && 
    account.payouts_enabled && 
    account.capabilities_status?.card_payments === 'active' &&
    account.capabilities_status?.transfers === 'active' &&
    !account.requirements_status.currently_due.length &&
    !account.requirements_status.eventually_due.length &&
    !account.requirements_status.past_due.length;

  if (isFullyActive) {
    return {
      badge: <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>,
      details: [],
      severity: 'success'
    };
  }

  // Account is in progress/pending state
  const details: string[] = [];
  let severity: 'warning' | 'error' = 'warning';

  // Check if either charges or payouts are disabled
  if (!account.charges_enabled || !account.payouts_enabled) {
    details.push('Account verification needed for full activation');
    
    if (!account.charges_enabled) {
      details.push('Charges are currently disabled');
    }
    if (!account.payouts_enabled) {
      details.push('Payouts are currently disabled');
    }
  }

  // Check capabilities
  if (account.capabilities_status) {
    if (account.capabilities_status.card_payments !== 'active') {
      details.push(`Card payments: ${account.capabilities_status.card_payments || 'inactive'}`);
    }
    if (account.capabilities_status.transfers !== 'active') {
      details.push(`Transfers: ${account.capabilities_status.transfers || 'inactive'}`);
    }
  }

  // Check requirements with priority
  if (account.requirements_status) {
    if (account.requirements_status.past_due.length > 0) {
      severity = 'error';
      details.push('Past due requirements need immediate attention');
    }
    if (account.requirements_status.currently_due.length > 0) {
      details.push('Additional verification required');
    }
    if (account.requirements_status.eventually_due.length > 0) {
      details.push('Future verification requirements pending');
    }
  }

  // Check bank account
  if (!account.has_external_account) {
    details.push('Bank account needs to be connected');
  }

  // If account appears active but has pending requirements, show special status
  if (account.charges_enabled && account.payouts_enabled && details.length > 0) {
    return {
      badge: <Badge variant="secondary">Verification in Progress</Badge>,
      details: ['Account is active but additional verification is in progress', ...details],
      severity: 'warning'
    };
  }

  return {
    badge: <Badge variant={severity === 'error' ? 'destructive' : 'secondary'}>
      {severity === 'error' ? 'Action Required' : 'Pending Verification'}
    </Badge>,
    details,
    severity
  };
}

function StatusBadge({ enabled, label }: { enabled: boolean; label: string }) {
  if (enabled) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
      {label}
    </Badge>
  );
}

export function ConnectedAccountsList({ orgId, onAccountDeleted }: ConnectedAccountsListProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<ConnectedAccount | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAccounts();
  }, [orgId]);

  async function fetchAccounts() {
    try {
      const response = await fetch('/api/stripe/connect/accounts?orgId=' + orgId);
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError('Failed to load connected accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(account: ConnectedAccount) {
    setDeleting(true);
    try {
      const response = await fetch('/api/stripe/connect/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId })
      });

      if (!response.ok) throw new Error('Failed to delete account');
      
      setAccounts(accounts.filter(a => a.id !== account.id));
      onAccountDeleted?.();
    } catch (err) {
      setError('Failed to delete account');
      console.error(err);
    } finally {
      setDeleting(false);
      setAccountToDelete(null);
    }
  }

  async function handleDashboard(accountId: string) {
    try {
      const response = await fetch(`/api/stripe/connect/dashboard?accountId=${accountId}`);
      if (!response.ok) throw new Error('Failed to get dashboard link');
      const { url } = await response.json();
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open dashboard:', err);
    }
  }

  async function handleSync(accountId: string) {
    if (syncing[accountId]) return;

    setSyncing(prev => ({ ...prev, [accountId]: true }));
    try {
      const response = await fetch('/api/stripe/connect/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });

      if (!response.ok) throw new Error('Failed to sync account');
      
      // Refresh accounts list
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to sync account:', err);
    } finally {
      setSyncing(prev => ({ ...prev, [accountId]: false }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        <AlertTriangle className="h-5 w-5 inline-block mr-2" />
        {error}
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No connected accounts found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map(account => {
        const { badge, details, severity } = getAccountStatusDetails(account);
        
        return (
          <Card key={account.id} className={cn("p-6", {
            'border-yellow-200 bg-yellow-50': severity === 'warning',
            'border-red-200 bg-red-50': severity === 'error'
          })}>
            <div className="space-y-6">
              {/* Header Section */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">
                      {account.is_test_mode ? 'Test Account' : 'Live Account'}
                    </h3>
                    {badge}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Country: {account.country}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Connected: {new Date(account.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last synced: {new Date(account.last_synced_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSync(account.account_id)}
                    disabled={syncing[account.account_id]}
                  >
                    <RefreshCw className={cn(
                      "h-4 w-4 mr-2",
                      { "animate-spin": syncing[account.account_id] }
                    )} />
                    {syncing[account.account_id] ? 'Syncing...' : 'Sync'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDashboard(account.account_id)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setAccountToDelete(account)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Status Summary */}
              {details.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-background">
                  <div className="flex items-start gap-3">
                    {severity === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className="font-medium">
                        {severity === 'error' ? 'Action Required' : 'Verification Needed'}
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {details.map((detail, index) => (
                          <li key={index}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Grid */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Account Status</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <StatusBadge enabled={account.charges_enabled} label="Charges" />
                      <StatusBadge enabled={account.payouts_enabled} label="Payouts" />
                      <StatusBadge enabled={account.has_external_account} label="Bank Account" />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Capabilities</h4>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Badge variant={account.capabilities_status?.card_payments === 'active' ? 'default' : 'secondary'}>
                        Card Payments: {account.capabilities_status?.card_payments || 'inactive'}
                      </Badge>
                      <Badge variant={account.capabilities_status?.transfers === 'active' ? 'default' : 'secondary'}>
                        Transfers: {account.capabilities_status?.transfers || 'inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements Section */}
              {(account.requirements_status.currently_due.length > 0 ||
                account.requirements_status.eventually_due.length > 0 ||
                account.requirements_status.past_due.length > 0) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Requirements</h4>
                  <div className="space-y-4">
                    {account.requirements_status.currently_due.length > 0 && (
                      <div>
                        <p className="text-sm text-yellow-600 font-medium mb-1">Required Now:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {account.requirements_status.currently_due.map((req, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              {req.split('_').join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {account.requirements_status.eventually_due.length > 0 && (
                      <div>
                        <p className="text-sm text-blue-600 font-medium mb-1">Required Later:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {account.requirements_status.eventually_due.map((req, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-blue-500" />
                              {req.split('_').join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {account.requirements_status.past_due.length > 0 && (
                      <div>
                        <p className="text-sm text-red-600 font-medium mb-1">Past Due:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {account.requirements_status.past_due.map((req, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                              {req.split('_').join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Due Date Warning */}
              {account.requirements_due_date && (
                <div className="border-t pt-4">
                  <p className="text-sm text-red-500 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Requirements due by: {new Date(account.requirements_due_date).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Verification Status */}
              {(account.verification_status.fields_needed.length > 0 ||
                account.verification_status.verified_fields.length > 0) && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium mb-2">Verification Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {account.verification_status.verified_fields.length > 0 && (
                      <div>
                        <p className="text-sm text-green-600 font-medium mb-1">Verified:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {account.verification_status.verified_fields.map((field, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              {field.split('_').join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {account.verification_status.fields_needed.length > 0 && (
                      <div>
                        <p className="text-sm text-yellow-600 font-medium mb-1">Needed:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {account.verification_status.fields_needed.map((field, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              {field.split('_').join(' ')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connected Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this Stripe connected account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && handleDelete(accountToDelete)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 