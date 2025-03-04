'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ExternalLink, 
  MoreHorizontal, 
  ArrowUp, 
  ArrowDown,
  AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteOrganizationMembershipAction } from '@/server/actions/organization-membership.actions';
import { OrganizationMembershipView } from '@/types/database.types';

interface AffiliationItemProps {
  affiliation: OrganizationMembershipView;
  type: 'parent' | 'child';
  orgSlug: string;
  onDelete?: () => void;
}

export default function AffiliationItem({ 
  affiliation, 
  type,
  orgSlug,
  onDelete 
}: AffiliationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationName = type === 'parent' 
    ? affiliation.host_organization_name 
    : affiliation.member_organization_name;
  
  const organizationSlug = type === 'parent' 
    ? affiliation.host_organization_slug 
    : affiliation.member_organization_slug;

  const membershipTierName = affiliation.membership_tier_name || 'Standard';
  const statusDisplay = affiliation.status?.toUpperCase() || 'PENDING';
  const isActive = affiliation.is_active;
  
  const getStatusColor = () => {
    if (!isActive) return "destructive";
    
    switch (affiliation.status?.toLowerCase()) {
      case 'approved':
        return "success";
      case 'pending':
        return "warning";
      case 'rejected':
        return "destructive";
      default:
        return "secondary";
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const result = await deleteOrganizationMembershipAction(orgSlug, affiliation.id);
      
      if (result.error) {
        setError(result.error);
      } else if (onDelete) {
        onDelete();
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting the affiliation.');
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-stretch">
        <div 
          className={`w-1.5 ${type === 'parent' ? 'bg-blue-500' : 'bg-green-500'}`}
          aria-hidden="true"
        />
        
        <div className="flex-1">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                {organizationName}
                {type === 'parent' ? (
                  <ArrowUp className="h-4 w-4 text-blue-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-green-500" />
                )}
              </CardTitle>
              <CardDescription>
                {type === 'parent' 
                  ? 'Host organization for your memberships' 
                  : 'Member organization in your network'}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor() as any}>{statusDisplay}</Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/@${organizationSlug}`} target="_blank">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Organization
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" asChild>
                    <AlertDialogTrigger className="w-full justify-start">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Delete Affiliation
                    </AlertDialogTrigger>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Membership Tier</p>
                <p className="font-medium">{membershipTierName}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Relationship</p>
                <p className="font-medium capitalize">
                  {type === 'parent' ? 'Member of this organization' : 'Host organization'}
                </p>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </div>
      </div>
      
      <AlertDialog>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the affiliation between your organization and {organizationName}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
} 