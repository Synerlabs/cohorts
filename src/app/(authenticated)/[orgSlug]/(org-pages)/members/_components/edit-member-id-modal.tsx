'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient as createBrowserClient } from '@/lib/utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updateGroupUserMemberId, deleteGroupUserMemberId } from '@/actions/member.actions';
import { Loader2, CheckCircle, XCircle, Clock, Trash2, Save } from 'lucide-react';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';

interface EditMemberIdModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  orgId: string;
  groupUserId: string;
  currentMemberId: string | null | undefined;
}

export function EditMemberIdModal({
  isOpen,
  setIsOpen,
  orgId,
  groupUserId,
  currentMemberId,
}: EditMemberIdModalProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [resetKey, setResetKey] = useState(0);
  
  // Local state for member ID input and validation
  const [memberIdInput, setMemberIdInput] = useState(() => currentMemberId || '');
  const [memberIdStatus, setMemberIdStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [memberIdError, setMemberIdError] = useState<string | null>(null);
  const [isMemberIdValid, setIsMemberIdValid] = useState(true);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Action states with toasts
  const [updateState, updateAction, isPendingUpdate] = useToastActionState(
    updateGroupUserMemberId,
    null,
    undefined,
    { 
      successTitle: "Success",
      successDescription: memberIdInput ? `Member ID updated to ${memberIdInput}.` : "Member ID cleared."
    }
  );
  
  const [deleteState, deleteAction, isPendingDelete] = useToastActionState(
    deleteGroupUserMemberId,
    null,
    undefined,
    {
      successTitle: "Success",
      successDescription: "Member ID deleted."
    }
  );
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setMemberIdInput(currentMemberId || '');
      setMemberIdStatus('idle');
      setIsMemberIdValid(true);
      setMemberIdError(null);
      setResetKey(prev => prev + 1);
      
      // Clear any pending timeouts
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    }
  }, [isOpen, currentMemberId]);
  
  // Close modal on success
  useEffect(() => {
    if (updateState?.success) {
      setIsOpen(false);
    }
    
    if (deleteState?.success) {
      setIsDeleteConfirmOpen(false);
      setIsOpen(false);
    }
  }, [updateState, deleteState, setIsOpen, setIsDeleteConfirmOpen]);
  
  // Check ID availability with debounce
  const checkIdAvailability = useCallback(async (idToCheck: string) => {
    if (!idToCheck || idToCheck === currentMemberId) {
      setMemberIdStatus('idle');
      setIsMemberIdValid(true);
      setMemberIdError(null);
      return;
    }
    
    setMemberIdStatus('checking');
    setMemberIdError(null);
    
    try {
      const supabase = createBrowserClient();
      const { data: existingData, error: checkError } = await supabase
        .from('member_ids')
        .select('id')
        .eq('group_id', orgId)
        .eq('member_id', idToCheck)
        .not('group_user_id', 'eq', groupUserId)
        .maybeSingle();

      if (checkError) throw new Error("Database error checking ID");

      if (!existingData) { 
        setMemberIdStatus('available');
        setIsMemberIdValid(true);
      } else { 
        setMemberIdStatus('taken');
        setMemberIdError('This Member ID is already taken by another user.');
        setIsMemberIdValid(false);
      }
    } catch (err) {
      console.error("Frontend checkMemberId error:", err);
      setMemberIdStatus('error');
      setMemberIdError('Failed to check ID availability.');
      setIsMemberIdValid(false);
    }
  }, [currentMemberId, orgId, groupUserId]);
  
  // Handle member ID input change with debounce
  const handleMemberIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMemberIdInput(newValue);
    setMemberIdStatus('idle');
    setIsMemberIdValid(true);
    setMemberIdError(null);
    
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Set a new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      checkIdAvailability(newValue);
    }, 500);
  }, [checkIdAvailability]);
  
  // Form submission handlers
  const handleUpdateSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isMemberIdValid && memberIdStatus !== 'checking') {
      toast({ 
        variant: "destructive", 
        title: "Invalid Member ID", 
        description: memberIdError 
      });
      return;
    }
    
    if (memberIdInput === currentMemberId) {
      toast({ 
        title: "No Change", 
        description: "Member ID is the same.", 
        variant: "default" 
      });
      return;
    }
    
    const formData = new FormData(event.currentTarget);
    updateAction(formData);
  }, [isMemberIdValid, memberIdStatus, memberIdError, memberIdInput, currentMemberId, toast, updateAction]);
  
  const handleDeleteConfirm = useCallback(() => {
    if (!formRef.current) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "Could not initiate delete action." 
      });
      return;
    }
    
    const formData = new FormData(formRef.current);
    deleteAction(formData);
    setIsDeleteConfirmOpen(false);
  }, [deleteAction, toast]);
  
  // Validation indicator helper
  const getValidationIndicator = useCallback(() => {
    if (!memberIdInput || memberIdInput === currentMemberId) return null;
    
    switch (memberIdStatus) {
      case 'checking': return <Clock className="h-4 w-4 text-muted-foreground animate-spin" />;
      case 'available': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'taken': case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  }, [memberIdInput, currentMemberId, memberIdStatus]);
  
  // Determine if save button should be disabled
  const isSaveDisabled = 
    isPendingUpdate || 
    isPendingDelete || 
    (memberIdInput === currentMemberId) || 
    (!isMemberIdValid && memberIdStatus !== 'checking');
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Member ID</DialogTitle>
          <DialogDescription>
            {currentMemberId ? "Update" : "Assign"} the member ID for this user. This ID must be unique within the organization.
          </DialogDescription>
        </DialogHeader>
        
        <form key={resetKey} ref={formRef} onSubmit={handleUpdateSubmit}>
          <div className="py-4 space-y-4">
            <input type="hidden" name="groupUserId" value={groupUserId} />
            <input type="hidden" name="orgId" value={orgId} />
            <div>
              <Label htmlFor="edit-memberId">Member ID</Label>
              <div className="relative mt-1">
                <Input
                  id="edit-memberId"
                  name="newMemberId" 
                  placeholder="Enter unique Member ID" 
                  className={`font-mono pr-8 ${!isMemberIdValid && memberIdInput ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={memberIdInput}
                  onChange={handleMemberIdChange}
                  disabled={isPendingUpdate || isPendingDelete}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {getValidationIndicator()}
                </div>
              </div>
              {memberIdStatus === 'taken' || (memberIdStatus === 'error' && memberIdError) ? (
                <p className="text-sm text-destructive mt-1">{memberIdError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank only if you intend to delete the existing ID using the Delete button.
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between gap-2">
            {/* Delete Button & Confirmation */} 
            {currentMemberId && (
              <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    type="button" 
                    disabled={isPendingUpdate || isPendingDelete}
                    className="w-full sm:w-auto order-last sm:order-first"
                  >
                    {isPendingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete ID
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the Member ID record ({currentMemberId}) for this user. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPendingDelete}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteConfirm}
                      disabled={isPendingDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isPendingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Yes, Delete ID
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {!currentMemberId && <div className="hidden sm:block"/>}

            {/* Save Button */} 
            <Button
              type="submit" 
              disabled={isSaveDisabled}
              className="w-full sm:w-auto"
            >
              {isPendingUpdate ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 