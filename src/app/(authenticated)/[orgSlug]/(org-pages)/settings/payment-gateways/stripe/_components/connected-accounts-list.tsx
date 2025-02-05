'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Trash2 } from 'lucide-react';
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

interface ConnectedAccount {
  id: string;
  account_id: string;
  org_id: string;
  country: string;
  is_test_mode: boolean;
  account_status: 'pending' | 'active' | 'disconnected';
  created_at: string;
  updated_at: string;
}

interface ConnectedAccountsListProps {
  orgId: string;
  onAccountDeleted?: () => void;
}

export function ConnectedAccountsList({ orgId, onAccountDeleted }: ConnectedAccountsListProps) {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<ConnectedAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      {accounts.map(account => (
        <Card key={account.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">
                  {account.is_test_mode ? 'Test Account' : 'Live Account'}
                </h3>
                {account.account_status === 'active' && (
                  <span className="flex items-center text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Active
                  </span>
                )}
                {account.account_status === 'pending' && (
                  <span className="flex items-center text-sm text-yellow-600">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Pending
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Country: {account.country}
              </p>
              <p className="text-sm text-muted-foreground">
                Connected: {new Date(account.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {account.account_status === 'active' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/api/stripe/connect/dashboard?accountId=${account.account_id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              )}
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setAccountToDelete(account)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

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