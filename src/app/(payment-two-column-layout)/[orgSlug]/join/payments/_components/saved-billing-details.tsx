'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BillingDetails } from '@/types/database.types';
import { Trash2, Check, Home, Star, StarOff, Users } from 'lucide-react';
import { BillingDetailsFormData, convertToFormData, setDefaultBillingDetail, deleteBillingDetail } from '@/lib/services/billing-details.service';
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
import { cn } from '@/lib/utils';
import { useParams } from 'next/navigation';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { deleteBillingDetailAction } from '@/lib/services/billing-details.actions';

interface SavedBillingDetailsProps {
  savedDetails: BillingDetails[];
  userId: string;
  onSelect: (formData: BillingDetailsFormData, isDefault: boolean, billingDetailId: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  limit?: number; // Optional limit for how many details to display
}

export function SavedBillingDetails({
  savedDetails,
  userId,
  onSelect,
  onDelete,
  onSetDefault,
  limit = 3 // Default to showing 3 billing details
}: SavedBillingDetailsProps) {
  const params = useParams<{ orgSlug: string }>();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState<BillingDetails | null>(null);
  const [showAll, setShowAll] = useState(false); // State to toggle showing all details
  
  const [deleteState, deleteBillingDetail, deletePending] = useToastActionState(
    deleteBillingDetailAction,
    undefined,
    undefined,
    {
      successTitle: 'Billing Detail Deleted',
      successDescription: 'The billing detail has been successfully deleted',
    }
  );

  const handleDeleteClick = (detail: BillingDetails) => {
    setDeletingDetail(detail);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (deletingDetail) {
      console.log('Confirming delete of billing detail', deletingDetail.id);
      
      const formData = new FormData();
      formData.append('billingDetailId', deletingDetail.id);
      formData.append('userId', userId);
      
      await deleteBillingDetail(formData);
      
      // Still call the parent's onDelete so it can update the UI
      if (onDelete) {
        onDelete(deletingDetail.id);
      }
    }
    setIsDeleteDialogOpen(false);
    setDeletingDetail(null);
  };
  
  const handleSetDefault = async (id: string) => {
    onSetDefault(id);
  };
  
  if (!savedDetails || savedDetails.length === 0) {
    return null;
  }
  
  // First prioritize defaults, then sort by most recently updated
  const sortedDetails = [...savedDetails].sort((a, b) => {
    // Default details come first
    if (a.is_default && !b.is_default) return -1;
    if (!a.is_default && b.is_default) return 1;
    
    // Then sort by updated_at (most recent first)
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  
  // Only display limited number of details if not showing all
  const displayedDetails = showAll ? sortedDetails : sortedDetails.slice(0, limit);
  const hasMoreDetails = sortedDetails.length > limit;
  
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Saved Billing Details</h4>
      
      {displayedDetails.map((detail) => (
        <div 
          key={detail.id}
          className={cn(
            "border rounded-md p-4 transition-colors",
            detail.is_default ? "border-primary/20 bg-primary/5" : "border-slate-200"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="font-medium">{detail.full_name}</div>
              {detail.is_default && (
                <div className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full flex items-center">
                  <Star className="h-3 w-3 mr-1" />
                  <span>Default</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!detail.is_default && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => handleSetDefault(detail.id)}
                >
                  <Star className="h-3.5 w-3.5 mr-1.5" />
                  Set as Default
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 px-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDeleteClick(detail)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{detail.email}</span>
            </div>
            {detail.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{detail.phone}</span>
              </div>
            )}
            {detail.company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{detail.company}</span>
              </div>
            )}
            {detail.address && (
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <Home className="h-3.5 w-3.5" />
                <span className="whitespace-normal">
                  {[
                    detail.address,
                    detail.city,
                    detail.state,
                    detail.zip_code,
                    detail.country !== 'US' ? detail.country : ''
                  ].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onSelect(convertToFormData(detail), detail.is_default, detail.id)}
            >
              Use these details
            </Button>
          </div>
        </div>
      ))}
      
      {hasMoreDetails && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Less" : `Show ${sortedDetails.length - limit} More`}
        </Button>
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this billing detail. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePending}
            >
              {deletePending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 