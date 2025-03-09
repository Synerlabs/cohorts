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

interface SavedBillingDetailsProps {
  savedDetails: BillingDetails[];
  userId: string;
  onSelect: (formData: BillingDetailsFormData, isDefault: boolean) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function SavedBillingDetails({
  savedDetails,
  userId,
  onSelect,
  onDelete,
  onSetDefault
}: SavedBillingDetailsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteBillingDetail(userId, deletingId);
        onDelete(deletingId);
      } catch (error) {
        console.error('Error deleting billing detail:', error);
      }
    }
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };
  
  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultBillingDetail(userId, id);
      onSetDefault(id);
    } catch (error) {
      console.error('Error setting default billing detail:', error);
    }
  };
  
  if (!savedDetails || savedDetails.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Saved Billing Details</h4>
      
      {savedDetails.map((detail) => (
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
                onClick={() => handleDelete(detail.id)}
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
              onClick={() => onSelect(convertToFormData(detail), detail.is_default)}
            >
              Use these details
            </Button>
          </div>
        </div>
      ))}
      
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 