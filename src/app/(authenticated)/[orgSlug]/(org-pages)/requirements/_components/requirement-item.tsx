'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, AlertTriangle, CheckCircle, ToggleLeft, Building2, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
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
import { deleteRequirementAction } from '@/server/actions/organization-requirements.actions';
import { useRouter } from 'next/navigation';

interface RequirementItemProps {
  requirement: any; // Replace with proper type
  orgSlug: string;
  onDelete?: () => void;
}

export default function RequirementItem({ requirement, orgSlug, onDelete }: RequirementItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get requirement type display name
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'form':
      case 'APPLICATION_FORM':
        return 'Form Submission';
      case 'membership_tier':
      case 'MEMBERSHIP_TIER':
        return 'Membership Tier';
      case 'children_count':
      case 'CONNECTED_ORGANIZATION':
        return 'Connected Organization';
      case 'parent_relationship':
      case 'PARENT_RELATIONSHIP':
        return 'Parent Relationship';
      default:
        return type;
    }
  };

  // Get badge color based on requirement type
  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'form':
      case 'APPLICATION_FORM':
        return 'default';
      case 'membership_tier':
      case 'MEMBERSHIP_TIER':
        return 'secondary';
      case 'children_count':
      case 'CONNECTED_ORGANIZATION':
        return 'outline';
      case 'parent_relationship':
      case 'PARENT_RELATIONSHIP':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Get purpose description based on type
  const getPurposeText = (type: string) => {
    switch (type) {
      case 'form':
      case 'APPLICATION_FORM':
        return 'Organizations must complete this form before establishing a connection';
      case 'membership_tier':
      case 'MEMBERSHIP_TIER':
        return 'Organizations must have a specific membership tier before connecting';
      case 'children_count':
      case 'CONNECTED_ORGANIZATION':
        return 'Organizations must have connections with other organizations';
      case 'parent_relationship':
      case 'PARENT_RELATIONSHIP':
        return 'Organizations must have a specific relationship type with parent organizations';
      default:
        return 'Requirement for organizational connections';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      const result = await deleteRequirementAction(orgSlug, requirement.id);
      if (result.error) {
        setError(result.error);
      } else {
        if (onDelete) {
          onDelete();
        }
        router.refresh();
      }
    } catch (err) {
      console.error('Error deleting requirement:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{requirement.title}</CardTitle>
            <CardDescription>
              {getPurposeText(requirement.type)}
            </CardDescription>
          </div>
          <Badge variant={getBadgeVariant(requirement.type)}>
            {getTypeDisplay(requirement.type)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {requirement.is_active ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-200">
                  <ToggleLeft className="h-3 w-3 mr-1" />
                  Inactive
                </Badge>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4" />
                <span>Connection Requirement</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link href={`/${orgSlug}/requirements/${requirement.id}`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </Link>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Connection Requirement</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this requirement? Removing it will change which organizations can connect to yours. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2 text-red-800">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>{error}</div>
                    </div>
                  )}
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete();
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          
          {/* Show specific requirement details based on type */}
          {requirement.description && (
            <p className="text-sm text-muted-foreground">{requirement.description}</p>
          )}
          
          {(requirement.type === 'form' || requirement.type === 'APPLICATION_FORM') && requirement.form && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Required Form:</span>{' '}
              {requirement.form.title}
            </div>
          )}
          
          {(requirement.type === 'membership_tier' || requirement.type === 'MEMBERSHIP_TIER') && requirement.required_membership_tier_id && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Required Membership Tier:</span>{' '}
              {requirement.required_membership_tier_id}
            </div>
          )}
          
          {(requirement.type === 'children_count' || requirement.type === 'CONNECTED_ORGANIZATION') && requirement.required_children_count !== null && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Required Connected Organizations:</span>{' '}
              {requirement.required_children_count}
            </div>
          )}
          
          {(requirement.type === 'parent_relationship' || requirement.type === 'PARENT_RELATIONSHIP') && requirement.required_parent_relationship_type && (
            <div className="flex items-center gap-2 mt-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Required Relationship Type:</span>{' '}
              {requirement.required_parent_relationship_type}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 