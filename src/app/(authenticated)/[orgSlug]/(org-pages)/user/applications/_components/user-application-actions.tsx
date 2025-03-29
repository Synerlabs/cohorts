'use client';

import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { cancelApplication } from "../_actions/cancel-application";
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

interface UserApplicationActionsProps {
  applicationId: string;
  status: string;
  orgSlug: string;
  className?: string;
  size?: "default" | "sm";
  onCancel?: () => void;
}

export function UserApplicationActions({ 
  applicationId, 
  status,
  orgSlug,
  className = "",
  size = "default",
  onCancel
}: UserApplicationActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const { toast } = useToast();

  const handleCancelApplication = async () => {
    if (!applicationId) return;
    
    try {
      setCancelPending(true);
      const result = await cancelApplication(applicationId, orgSlug);
      
      toast({
        title: result.success ? "Application Cancelled" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.success) {
        if (onCancel) {
          onCancel();
        } else {
          // Force a page refresh to show updated data
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Error cancelling application:", error);
      toast({
        title: "Error",
        description: "There was an error cancelling your application. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setCancelPending(false);
      setIsDialogOpen(false);
    }
  };

  // Only show for cancellable statuses
  if (status !== 'pending' && status !== 'pending_payment') return null;

  return (
    <>
      <div className={`flex gap-2 ${className}`}>
        <Button 
          variant="destructive"
          onClick={() => setIsDialogOpen(true)}
          size={size}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel Application
        </Button>
      </div>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Application</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelApplication}
              disabled={cancelPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {cancelPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Yes, Cancel Application
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 