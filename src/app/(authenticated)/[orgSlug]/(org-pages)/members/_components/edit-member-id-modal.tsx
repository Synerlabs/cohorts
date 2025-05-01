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
import { Loader2, CheckCircle, XCircle, Clock, Trash2, Save, Wand2, Info, RefreshCw } from 'lucide-react';
import useToastActionState from '@/lib/hooks/toast-action-state.hook';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';

interface EditMemberIdModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  orgId: string;
  groupUserId: string;
  currentMemberId: string | null | undefined;
  memberIdsRecordId?: string | null;
}

export function EditMemberIdModal({
  isOpen,
  setIsOpen,
  orgId,
  groupUserId,
  currentMemberId,
  memberIdsRecordId,
}: EditMemberIdModalProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      successTitle: "Member ID Updated",
      successDescription: memberIdInput ? `Member ID successfully changed to ${memberIdInput}.` : "Member ID cleared."
    }
  );
  
  const [deleteState, deleteAction, isPendingDelete] = useToastActionState(
    deleteGroupUserMemberId,
    null,
    undefined,
    {
      successTitle: "Member ID Deleted",
      successDescription: "Member ID has been successfully removed."
    }
  );
  
  // Debug logging for props
  useEffect(() => {
    if (isOpen) {
      console.log('EditMemberIdModal opened with props:', {
        orgId,
        groupUserId,
        currentMemberId,
        memberIdsRecordId
      });
    }
  }, [isOpen, orgId, groupUserId, currentMemberId, memberIdsRecordId]);
  
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
      
      // Focus the input after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, currentMemberId]);
  
  // Close modal on success
  useEffect(() => {
    // Check for update success
    if (updateState?.success) {
      setIsOpen(false);
    }
    
    // Check for delete success
    if (deleteState?.success) {
      // Close both dialogs when delete succeeds
      setIsDeleteConfirmOpen(false);
      setIsOpen(false);
    }
  }, [updateState, deleteState, setIsOpen, setIsDeleteConfirmOpen]);
  
  // Add debug logging for delete state
  useEffect(() => {
    if (deleteState) {
      console.log('Delete state updated:', deleteState);
    }
  }, [deleteState]);
  
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
        setMemberIdError('This Member ID is already in use. Please try a different one.');
        setIsMemberIdValid(false);
      }
    } catch (err) {
      console.error("Frontend checkMemberId error:", err);
      setMemberIdStatus('error');
      setMemberIdError('Unable to verify this ID. Please try again.');
      setIsMemberIdValid(false);
    }
  }, [currentMemberId, orgId, groupUserId]);
  
  // Handle member ID input change with debounce
  const handleMemberIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMemberIdInput(newValue);
    setMemberIdStatus('idle');
    
    // Only validate if something was entered
    if (newValue.trim() !== '') {
      setIsMemberIdValid(true);
      setMemberIdError(null);
      
      // Clear any existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Set a new timeout
      debounceTimeoutRef.current = setTimeout(() => {
        checkIdAvailability(newValue);
      }, 300); // Reduced debounce time for better responsiveness
    }
  }, [checkIdAvailability]);
  
  // Generate a random member ID
  const generateRandomId = useCallback(() => {
    const generateId = () => {
      // Create a random ID with format ORG-YYYY-XXX where XXX is a random 3-digit number
      const year = new Date().getFullYear();
      const randomNum = Math.floor(Math.random() * 900) + 100; // Random 3-digit number
      return `MEM-${year}-${randomNum}`;
    };
    
    const newId = generateId();
    setMemberIdInput(newId);
    
    // Immediately check availability of the generated ID
    checkIdAvailability(newId);
  }, [checkIdAvailability]);
  
  // Form submission handlers
  const handleUpdateSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!isMemberIdValid && memberIdStatus !== 'checking') {
      toast({ 
        variant: "destructive", 
        title: "Invalid Member ID", 
        description: memberIdError || "Please fix validation errors before saving." 
      });
      return;
    }
    
    if (memberIdInput === currentMemberId) {
      toast({ 
        title: "No Change Needed", 
        description: "The Member ID is already set to this value.", 
        variant: "default" 
      });
      return;
    }
    
    const formData = new FormData(event.currentTarget);
    updateAction(formData);
  }, [isMemberIdValid, memberIdStatus, memberIdError, memberIdInput, currentMemberId, toast, updateAction]);
  
  const handleDeleteConfirm = useCallback(async () => {
    console.log('Delete confirmed, creating FormData with:', { 
      groupUserId, 
      orgId, 
      currentMemberId,
      memberIdsRecordId 
    });
    
    // Validate required parameters
    if (!groupUserId || !orgId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required parameters for deletion"
      });
      return;
    }
    
    // Create FormData with all available identifiers
    const formData = new FormData();
    formData.append('groupUserId', groupUserId);
    formData.append('orgId', orgId);
    
    // Add member ID if we have it
    if (currentMemberId) {
      formData.append('memberId', currentMemberId);
    }
    
    // Add record ID if we have it
    if (memberIdsRecordId) {
      formData.append('recordId', memberIdsRecordId);
    }
    
    // First try to find the record ID if we don't have it
    if (!memberIdsRecordId && currentMemberId) {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from('member_ids')
          .select('id')
          .eq('group_id', orgId)
          .eq('group_user_id', groupUserId)
          .eq('member_id', currentMemberId)
          .single();
        
        if (data?.id && !error) {
          console.log('Found record ID:', data.id);
          formData.append('recordId', data.id);
        }
      } catch (err) {
        console.error('Error finding member_ids record:', err);
      }
    }
    
    // Call the delete action
    console.log('Calling deleteAction with FormData');
    deleteAction(formData);
    
    // Close the confirmation dialog
    setIsDeleteConfirmOpen(false);
  }, [deleteAction, groupUserId, orgId, currentMemberId, memberIdsRecordId, setIsDeleteConfirmOpen, toast]);
  
  // Validation indicator helper
  const getValidationIndicator = useCallback(() => {
    if (!memberIdInput || memberIdInput === currentMemberId) return null;
    
    switch (memberIdStatus) {
      case 'checking': 
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
            </TooltipTrigger>
            <TooltipContent side="right">Checking availability...</TooltipContent>
          </Tooltip>
        );
      case 'available': 
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </TooltipTrigger>
            <TooltipContent side="right">This ID is available!</TooltipContent>
          </Tooltip>
        );
      case 'taken': 
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <XCircle className="h-4 w-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent side="right">This ID is already taken</TooltipContent>
          </Tooltip>
        );
      case 'error': 
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <XCircle className="h-4 w-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent side="right">Error checking availability</TooltipContent>
          </Tooltip>
        );
      default: return null;
    }
  }, [memberIdInput, currentMemberId, memberIdStatus]);
  
  // Determine if save button should be disabled
  const isSaveDisabled = 
    isPendingUpdate || 
    isPendingDelete || 
    (memberIdInput === currentMemberId) || 
    (!isMemberIdValid && memberIdStatus !== 'checking') || 
    memberIdInput.trim() === '';
  
  // Get status message for input
  const getStatusMessage = useCallback(() => {
    if (memberIdStatus === 'available' && memberIdInput !== currentMemberId) {
      return <p className="text-sm text-green-600 mt-1 flex items-center"><CheckCircle className="h-3 w-3 mr-1" /> This ID is available and ready to use</p>;
    }
    
    if (memberIdStatus === 'taken' || (memberIdStatus === 'error' && memberIdError)) {
      return <p className="text-sm text-destructive mt-1 flex items-center"><XCircle className="h-3 w-3 mr-1" /> {memberIdError}</p>;
    }
    
    return null;
  }, [memberIdStatus, memberIdInput, currentMemberId, memberIdError]);
  
  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentMemberId ? "Edit Member ID" : "Assign Member ID"}</DialogTitle>
            <DialogDescription>
              {currentMemberId 
                ? "Update the member identification number for this user. This ID must be unique within your organization."
                : "Assign a unique identification number to this member. This number will be used across the organization."}
            </DialogDescription>
          </DialogHeader>
          
          <form key={resetKey} ref={formRef} onSubmit={handleUpdateSubmit} className="space-y-4">
            <input type="hidden" name="groupUserId" value={groupUserId} />
            <input type="hidden" name="orgId" value={orgId} />
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-memberId" className="text-sm font-medium">
                  Member ID
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs flex items-center gap-1"
                      onClick={generateRandomId} 
                      type="button"
                    >
                      <Wand2 className="h-3 w-3" />
                      Generate
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Generate a random unique ID</TooltipContent>
                </Tooltip>
              </div>
              
              <div className="relative mt-1">
                <Input
                  id="edit-memberId"
                  name="newMemberId" 
                  placeholder="Enter unique Member ID (e.g., MEM-2024-001)" 
                  className={cn(
                    "font-mono pr-8 transition-all",
                    memberIdStatus === 'available' && "border-green-600 focus-visible:ring-green-600",
                    !isMemberIdValid && memberIdInput ? "border-destructive focus-visible:ring-destructive" : "",
                    isPendingUpdate && "opacity-70"
                  )}
                  value={memberIdInput}
                  onChange={handleMemberIdChange}
                  disabled={isPendingUpdate || isPendingDelete}
                  ref={inputRef}
                  aria-invalid={!isMemberIdValid}
                  aria-describedby={memberIdError ? "member-id-error" : undefined}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {getValidationIndicator()}
                </div>
              </div>
              
              {getStatusMessage()}
              
              {!getStatusMessage() && (
                <div className="flex items-start space-x-1 mt-1">
                  <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {currentMemberId 
                      ? "Current ID: " + currentMemberId + ". You can update it or leave blank to delete."
                      : "Suggested formats: MEM-2024-001, ORG-001, or any unique identifier."}
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter className="sm:justify-between gap-2 pt-2">
              {/* Delete Button & Confirmation */} 
              {currentMemberId && (
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      type="button" 
                      disabled={isPendingUpdate || isPendingDelete}
                      className="w-full sm:w-auto order-last sm:order-first"
                      aria-label="Delete Member ID"
                    >
                      {isPendingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete ID
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the Member ID <span className="font-mono font-medium">{currentMemberId}</span> for this user. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isPendingDelete}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault(); // Prevent default button behavior
                          handleDeleteConfirm();
                        }}
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

              {/* Cancel & Save Buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1 sm:flex-initial"
                  disabled={isPendingUpdate || isPendingDelete}
                >
                  Cancel
                </Button>
                <Button
                  type="submit" 
                  disabled={isSaveDisabled}
                  className="flex-1 sm:flex-initial"
                  aria-label={currentMemberId ? "Save Member ID changes" : "Assign Member ID"}
                >
                  {isPendingUpdate ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
} 