"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Affiliate, toggleAffiliateStatus } from "@/services/affiliate.service";
import { deleteAffiliate } from "../_actions/delete-affiliate.action";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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
import { useUser } from '@/lib/context/UserContext';

interface AffiliateActionsCellProps {
  affiliate: Affiliate;
  orgSlug: string;
  onStatusChange?: () => void;
}

export default function AffiliateActionsCell({ 
  affiliate, 
  orgSlug,
  onStatusChange 
}: AffiliateActionsCellProps) {
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Create a wrapper action for the server action that takes a FormData
  const deleteAffiliateAction = async (prevState: any, formData: FormData) => {
    if (!currentUser) {
      return { 
        success: false, 
        error: "You must be logged in" 
      };
    }
    
    const affiliateId = formData.get('affiliateId') as string;
    
    try {
      // Call the server action directly with the parameters
      const result = await deleteAffiliate(prevState, {
        affiliateId,
        orgSlug
      });
      
      // If there's an error in the result, show the error
      if (!result.success && result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in deleteAffiliateAction:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred"
      };
    }
  };
  
  // Use toast action state with our wrapper action
  const [deleteState, deleteFormAction, isPending] = useToastActionState(
    deleteAffiliateAction,
    null,
    "",
    {
      successTitle: "Affiliate Removed",
      successDescription: `${affiliate.childGroup?.name || "Affiliate"} has been removed successfully.`
    }
  );

  // Effect to close the dialog and refresh data when an action completes successfully
  useEffect(() => {
    if (deleteState?.success) {
      setIsDeleteDialogOpen(false);
      
      // Call the onStatusChange callback to refresh the table
      if (onStatusChange) {
        onStatusChange();
      }
    }
  }, [deleteState?.success, onStatusChange]);

  const handleToggleStatus = async () => {
    try {
      setIsLoading(true);
      
      // Call the API to toggle the status
      const success = await toggleAffiliateStatus(affiliate.id);
      
      if (success) {
        toast({
          title: `Affiliate ${affiliate.isActive ? "deactivated" : "activated"}`,
          description: `${affiliate.childGroup?.name} has been ${affiliate.isActive ? "deactivated" : "activated"} successfully.`,
        });
        
        // Call the onStatusChange callback if provided
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        throw new Error("Failed to update affiliate status");
      }
    } catch (error) {
      console.error("Error toggling affiliate status:", error);
      toast({
        title: "Error",
        description: "There was an error updating the affiliate's status.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append('affiliateId', affiliate.id);
    
    deleteFormAction(formData);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* View affiliate organization details */}
          <DropdownMenuItem
            onClick={() => window.open(`/@${affiliate.childGroup?.slug}`, '_blank')}
          >
            View Organization
          </DropdownMenuItem>
          
          {/* Toggle activation status */}
          <DropdownMenuItem onClick={handleToggleStatus} disabled={isLoading}>
            {isLoading ? "Processing..." : affiliate.isActive ? "Deactivate" : "Activate"} Affiliate
          </DropdownMenuItem>
          
          {/* Delete affiliate relationship */}
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isPending}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Affiliate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Affiliate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {affiliate.childGroup?.name} as an affiliate?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 