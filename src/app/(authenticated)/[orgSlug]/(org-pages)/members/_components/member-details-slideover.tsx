'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription, 
  SheetFooter, 
  SheetClose 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { type User } from "./user-table-row"; // Assuming User type is exported there
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { format } from 'date-fns';
import { getTierAndMembershipDataForUser, assignMembershipAction, cancelMembershipAction, deleteMembershipAction } from "../../(membership&affiliation)/_actions/membership.action"; // Correctly imports assignMembershipAction now
import { IMembershipTierProduct } from '@/lib/types/product'; // Import type
import type { MembershipWithTierAndProductName } from '../../(membership&affiliation)/_actions/membership.action'; // Import the specific type defined in the action file
import { Loader2, CheckCircle, XCircle, Info, PlusCircle, XIcon, AlignLeft, Calendar, User as UserIcon, Receipt, RefreshCcw, ClipboardCopy, ChevronRight, Pencil } from "lucide-react"; // Added Pencil icon
import { useToast } from "@/components/ui/use-toast"; // IMPORT correct hook
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"; // Import Select components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MembershipStatus } from "@/lib/types/membership"; // Import the enum
import { EditMemberIdModal } from "./edit-member-id-modal"; // Import the edit modal component
import { useRouter, useSearchParams, usePathname } from 'next/navigation'; // Add Next.js router imports

// Helper to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

interface MemberDetailsSlideOverProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export default function MemberDetailsSlideOver({
  user,
  isOpen,
  onOpenChange,
  orgId
}: MemberDetailsSlideOverProps) {
  const [availableTiers, setAvailableTiers] = useState<IMembershipTierProduct[]>([]);
  const [userMemberships, setUserMemberships] = useState<MembershipWithTierAndProductName[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null); // State for selected tier
  const [isRefreshing, setIsRefreshing] = useState(false); // New state for refresh indicator
  const [isAssigning, startAssignTransition] = useTransition(); // Pending state for assignment
  const [showConfirmation, setShowConfirmation] = useState(false); // State for confirmation dialog
  const [mobileTab, setMobileTab] = useState<string>("profile"); // For mobile tab navigation
  // New states for custom assignment options
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [customMemberId, setCustomMemberId] = useState<string>("");
  const [existingMemberId, setExistingMemberId] = useState<string | null>(null); // Track existing member ID
  const { toast } = useToast(); // Get toast function from the hook
  // State for cancel membership confirmation
  const [membershipToCancel, setMembershipToCancel] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCancelling, startCancelTransition] = useTransition();
  const [cancelReason, setCancelReason] = useState<string>("");
  // Add new state for delete functionality
  const [membershipToDelete, setMembershipToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  // URL-based routing for member ID editing
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Check if this user's member ID is being edited
  const editMemberId = searchParams.get('editMemberId');
  const isEditingMemberId = user && editMemberId === user.id;
  const editMemberIdPrev = useRef<string | null>(null);
  
  // Function to open member ID edit modal via URL
  const handleEditMemberIdClick = () => {
    if (!user) return;
    
    // Create new URLSearchParams with current params plus our edit param
    const params = new URLSearchParams(searchParams);
    params.set('editMemberId', user.id);
    
    // Update URL to include the edit param
    router.push(`${pathname}?${params.toString()}`);
  };
  
  // Function to close member ID edit modal via URL
  const handleMemberIdModalClose = () => {
    // Remove the editMemberId param from URL
    const params = new URLSearchParams(searchParams);
    params.delete('editMemberId');
    
    // Update URL without the edit param
    router.push(`${pathname}?${params.toString()}`);
  };

  // Main data fetching effect
  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const { tiers, userMemberships: memberships } = await getTierAndMembershipDataForUser(orgId, user.userId);
          setAvailableTiers(tiers);
          setUserMemberships(memberships);
        } catch (err) {
          console.error("Failed to fetch member details:", err);
          setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    } else {
      // Reset states when closing
      setMobileTab("profile");
      setSelectedTierId(null);
      setAvailableTiers([]);
      setUserMemberships([]);
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen, user, orgId]); // Rerun when user or orgId changes, or drawer opens

  // Refresh data when member ID modal is closed (editMemberId changed from user.id to null)
  useEffect(() => {
    // If we were editing this user's member ID and now it's not being edited
    if (editMemberIdPrev.current === user?.id && editMemberId === null && user) {
      // Refresh memberships to get updated data
      const timer = setTimeout(async () => {
        if (user) { // Double-check user is still defined
          try {
            const { userMemberships: memberships } = await getTierAndMembershipDataForUser(orgId, user.userId);
            setUserMemberships(memberships);
          } catch (err) {
            console.error("Failed to refresh member data after ID update:", err);
          }
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    // Keep track of previous editMemberId
    editMemberIdPrev.current = editMemberId;
  }, [editMemberId, user, orgId]);

  if (!user) return null; // Don't render if no user is selected

  // Determine status text/variant based on user state
  let statusText = "Unknown";
  let statusVariant: "default" | "outline" | "destructive" = "outline";
  if (user.isDeleted) {
    statusText = "Deleted";
    statusVariant = "destructive";
  } else if (user.isActive) {
    statusText = "Active";
    statusVariant = "default";
  } else {
    statusText = "Pending Invite";
    statusVariant = "outline";
  }

  const userName = user.profile?.firstName || user.profile?.lastName 
    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
    : "Unnamed User";

  const refreshMemberships = async () => {
    if (!user) return;
    
    setIsRefreshing(true);
    try {
      const { userMemberships: updatedMemberships } = await getTierAndMembershipDataForUser(orgId, user.userId);
      setUserMemberships(updatedMemberships);
      toast({ 
        title: "Refreshed",
        description: "Membership data has been updated.",
        variant: "default",
      });
    } catch (err) {
      console.error("Failed to refresh memberships:", err);
      toast({ 
        title: "Refresh Failed",
        description: "Could not refresh membership data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // New function to handle tier selection
  const handleTierSelection = async (tierId: string) => {
    setSelectedTierId(tierId);
    setExistingMemberId(null); // Reset existing member ID
    setCustomMemberId(""); // Clear any custom member ID
    
    if (!user) return;
    
    // Check if this user already has a membership with this tier format
    try {
      // Make a call to assignMembershipAction which will check if the member has an existing ID
      // that matches the format of the selected tier. We don't need to provide any options
      // since we're just doing a dry-run check here.
      const result = await assignMembershipAction(user.userId, orgId, tierId);
      
      // If there's an existing member ID, set it in the state
      if (result.existingMemberId) {
        setExistingMemberId(result.existingMemberId);
      }
    } catch (err) {
      console.error("Error checking existing member ID:", err);
    }
  };

  const handleAssignMembership = () => {
    if (!selectedTierId || !user) return;
    
    // Instead of showing a separate drawer, we'll handle everything in this component
    setShowConfirmation(true);
  };

  const confirmAssignMembership = () => {
    if (!selectedTierId || !user) return;
    
    setShowConfirmation(false); // Close confirmation dialog
    
    // Prepare options object based on user inputs
    const options: {
      startDate?: string;
      endDate?: string;
      memberId?: string;
    } = {};
    
    // Only include custom values if the checkbox is checked
    if (useCustomDates) {
      if (customStartDate) options.startDate = customStartDate;
      if (customEndDate) options.endDate = customEndDate;
    }
    
    // Include custom member ID if provided and no existing ID was detected
    if (customMemberId && !existingMemberId) options.memberId = customMemberId;
    
    startAssignTransition(async () => {
      try {
        // Pass options to the assignMembershipAction
        const result = await assignMembershipAction(user.userId, orgId, selectedTierId, options);
        if (!result.success) throw new Error(result.error || "Failed to assign membership");
        
        // Use the imported toast function with standard structure
        toast({ 
          title: "Membership Assigned",
          description: `Successfully assigned membership to ${userName}.`,
        });
        
        // Reset all form values
        setSelectedTierId(null);
        setUseCustomDates(false);
        setCustomStartDate("");
        setCustomEndDate("");
        setCustomMemberId("");
        setExistingMemberId(null);
        
        // Re-fetch memberships after successful assignment
        await refreshMemberships();
      } catch (err) {
        console.error("Failed to assign membership:", err);
        
        // Check for date overlap error and show more helpful message
        const errorMsg = err instanceof Error ? err.message : "An unknown error occurred.";
        const isDateOverlapError = errorMsg.includes("during the selected dates");
        
        toast({ 
          title: isDateOverlapError ? "Date Overlap Detected" : "Assignment Failed",
          description: errorMsg.includes("member_id") 
            ? "There was an issue with the custom member ID. The system will generate an ID automatically."
            : errorMsg,
          variant: "destructive", // Use destructive variant for errors
          action: isDateOverlapError ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowConfirmation(true);
                setUseCustomDates(true);
              }}
              className="mt-2"
            >
              Adjust Dates
            </Button>
          ) : undefined
        });
      }
    });
  };

  // Copy to clipboard functionality
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
        duration: 2000,
      });
    });
  };

  // Get selected tier details for confirmation dialog
  const selectedTier = availableTiers.find(tier => tier.id === selectedTierId);

  // Handle membership cancellation
  const handleCancelMembership = (membershipId: string) => {
    setMembershipToCancel(membershipId);
    setShowCancelConfirm(true);
  };
  
  const confirmCancelMembership = () => {
    if (!membershipToCancel) return;
    
    startCancelTransition(async () => {
      try {
        const result = await cancelMembershipAction(
          membershipToCancel, 
          orgId,
          'admin_cancelled',
          cancelReason || undefined
        );
        
        if (!result.success) throw new Error(result.error || "Failed to cancel membership");
        
        toast({ 
          title: "Membership Cancelled",
          description: "The membership has been successfully cancelled.",
        });
        
        // Reset states
        setMembershipToCancel(null);
        setShowCancelConfirm(false);
        setCancelReason("");
        
        // Refresh the memberships list
        await refreshMemberships();
      } catch (err) {
        console.error("Failed to cancel membership:", err);
        toast({ 
          title: "Cancellation Failed",
          description: err instanceof Error ? err.message : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  // Handle membership deletion
  const handleDeleteMembership = (membershipId: string) => {
    setMembershipToDelete(membershipId);
    setShowDeleteConfirm(true);
  };
  
  const confirmDeleteMembership = () => {
    if (!membershipToDelete) return;
    
    startDeleteTransition(async () => {
      try {
        const result = await deleteMembershipAction(
          membershipToDelete, 
          orgId
        );
        
        if (!result.success) throw new Error(result.error || "Failed to delete membership");
        
        toast({ 
          title: "Membership Deleted",
          description: "The membership has been permanently deleted.",
        });
        
        // Reset states
        setMembershipToDelete(null);
        setShowDeleteConfirm(false);
        
        // Refresh the memberships list
        await refreshMemberships();
      } catch (err) {
        console.error("Failed to delete membership:", err);
        toast({ 
          title: "Deletion Failed",
          description: err instanceof Error ? err.message : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md md:max-w-xl lg:max-w-3xl p-0 flex flex-col overflow-hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Member Details</SheetTitle>
          </SheetHeader>
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
            {/* Left column - User Details */}
            <div className="w-full md:w-1/3 overflow-y-auto border-r border-border bg-gray-50">
              <div className="p-6 pt-20 flex flex-col items-center">
                <Avatar className="h-24 w-24 mb-4 border-2 border-white shadow-sm">
                  <AvatarImage src={user.profile?.avatarUrl || undefined} />
                  <AvatarFallback className="text-3xl bg-gray-200 text-gray-800">{getInitials(user.profile?.firstName, user.profile?.lastName)}</AvatarFallback>
                </Avatar>
                
                <h2 className="text-2xl font-semibold text-center">{userName}</h2>
                
                {user.profile?.email && (
                  <p className="text-sm text-gray-500 mt-1 text-center mb-3">
                    {user.profile.email}
                  </p>
                )}
                
                <Badge 
                  variant={statusVariant} 
                  className={`mt-1 px-3 py-1 ${statusVariant === "default" ? "bg-emerald-500 hover:bg-emerald-500" : ""}`}
                >
                  {statusText}
                </Badge>
                
                <div className="flex items-center gap-2 mt-4">
                  <p className="text-sm text-gray-500">Member ID:</p>
                  <p className="text-sm font-mono font-medium">
                    {user.memberId || 'Not assigned'}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 rounded-full hover:bg-primary/10" 
                        onClick={handleEditMemberIdClick}
                      >
                        <Pencil className="h-3 w-3 text-gray-500 hover:text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>Edit Member ID</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="px-6 pb-6">
                <Separator className="mb-6" />
                
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">MEMBER DETAILS</h4>
                
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <Calendar className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Joined</p>
                      <p className="font-medium text-sm">{user.createdAt ? format(new Date(user.createdAt), 'PP') : 'April 30th, 2025'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <UserIcon className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">User ID</p>
                      <button 
                        className="font-mono text-xs text-gray-700 hover:text-primary flex items-center gap-1"
                        onClick={() => copyToClipboard(user.userId, "User ID")}
                      >
                        {user.userId.substring(0, 12)}...
                        <ClipboardCopy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-200 rounded-full p-2">
                      <UserIcon className="h-4 w-4 text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Group User ID</p>
                      <button 
                        className="font-mono text-xs text-gray-700 hover:text-primary flex items-center gap-1"
                        onClick={() => copyToClipboard(user.id, "Group User ID")}
                      >
                        {user.id.substring(0, 12)}...
                        <ClipboardCopy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Memberships */}
            <div className="w-full md:w-2/3 overflow-y-auto p-0 pt-10 bg-white">
              {/* Memberships Content */}
              {!showConfirmation ? (
                <div className="p-4 sm:p-6 pt-20 space-y-6">
                  {/* Membership Header with Refresh */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Memberships</h3>
                    </div>
                    
                    {!isLoading && !isRefreshing && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={refreshMemberships}
                        className="h-8 gap-1 text-xs group hover:bg-primary/10"
                      >
                        {isRefreshing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-500" />
                        )}
                        Refresh
                      </Button>
                    )}
                  </div>
                  
                  {/* Loading State */}
                  {(isLoading || isRefreshing) && (
                    <div className="flex items-center justify-center py-10 border rounded-md bg-muted/20 text-sm text-muted-foreground animate-pulse">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLoading ? "Loading memberships..." : "Refreshing memberships..."}
                    </div>
                  )}
                  
                  {/* Error State */}
                  {error && !isLoading && (
                    <div className="p-4 border rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                      <XCircle className="h-4 w-4 flex-shrink-0" />
                      <p>Error loading data: {error}</p>
                    </div>
                  )}
                  
                  {/* Memberships List */}
                  {!isLoading && !isRefreshing && !error && (
                    <div className="space-y-4">
                      {userMemberships.length > 0 ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-1">
                            {userMemberships.length} membership{userMemberships.length !== 1 ? 's' : ''} found
                          </p>
                          {userMemberships.map((membership, index) => (
                            <Card 
                              key={`${membership.id}-${index}`}
                              className={cn(
                                "shadow-sm transition-all duration-200 overflow-hidden hover:shadow-md focus-within:shadow-md animate-in slide-in-from-left-5",
                                membership.status === 'active' 
                                  ? "border-primary/20" 
                                  : "border-muted"
                              )}
                              style={{ animationDelay: `${index * 50}ms` }}
                              tabIndex={0}
                            >
                              <CardHeader className={cn(
                                "py-3 px-4 flex flex-row justify-between items-center",
                                membership.status === 'active' ? "bg-primary/5" : "bg-muted/20"
                              )}>
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "flex h-6 w-6 rounded-full items-center justify-center text-xs font-medium",
                                    membership.status === 'active' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                  )}>
                                    {index + 1}
                                  </div>
                                  <CardTitle className="text-base font-medium">
                                    {membership.membership_tier?.product?.name || 'Unknown Tier'}
                                  </CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={membership.status === 'active' ? 'default' : 'outline'}
                                    className={cn(
                                      'capitalize px-2.5 py-0.5',
                                      membership.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-500 text-white' : '',
                                      membership.status === 'expired' ? 'bg-amber-100 text-amber-800 border-amber-200' : '',
                                      membership.status === 'cancelled' ? 'bg-gray-100 text-gray-800 border-gray-200' : '',
                                      membership.status === 'suspended' ? 'bg-red-100 text-red-800 border-red-200' : '',
                                      (typeof membership.status === 'string' && membership.status.startsWith('pending')) ? 'bg-blue-100 text-blue-800 border-blue-200' : ''
                                    )}
                                  >
                                    {membership.status}
                                  </Badge>
                                  
                                  {/* Show cancel button for active memberships */}
                                  {membership.status === 'active' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full opacity-70 hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelMembership(membership.id);
                                          }}
                                        >
                                          <XCircle className="h-4 w-4" />
                                          <span className="sr-only">Cancel Membership</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Cancel Membership</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  
                                  {/* Add delete button for cancelled memberships */}
                                  {membership.status === 'cancelled' && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-6 w-6 rounded-full opacity-70 hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteMembership(membership.id);
                                          }}
                                        >
                                          <XIcon className="h-4 w-4" />
                                          <span className="sr-only">Delete Membership</span>
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Delete Membership</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 pt-3 text-sm">
                                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                                  {membership.member_id && (
                                    <>
                                      <span className="text-muted-foreground font-medium">Membership ID:</span>
                                      <div className="flex items-center gap-1">
                                        <span className="font-mono text-xs font-medium">{membership.member_id}</span>
                                        <button 
                                          className="hover:text-primary transition-colors" 
                                          onClick={() => copyToClipboard(membership.member_id!, "Membership ID")}
                                          title="Copy Membership ID"
                                        >
                                          <ClipboardCopy className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                  <span className="text-muted-foreground font-medium">Start Date:</span>
                                  <span className="font-medium">{membership.start_date ? format(new Date(membership.start_date), 'PP') : '-'}</span>
                                  <span className="text-muted-foreground font-medium">End Date:</span>
                                  <span className="font-medium">{membership.end_date ? format(new Date(membership.end_date), 'PP') : '-'}</span>
                                  <span className="text-muted-foreground font-medium">Created:</span>
                                  <span className="font-medium">{membership.created_at ? format(new Date(membership.created_at), 'PP') : '-'}</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-sm text-muted-foreground py-16 border rounded-md bg-muted/5 text-center gap-3 animate-in fade-in-50">
                          <div className="bg-primary/5 p-3 rounded-full">
                            <Info className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">No memberships found</p>
                            <p className="text-xs text-muted-foreground mt-1">This user doesn&apos;t have any memberships in this organization.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assignment Section */}
                  {!isLoading && !error && (
                    <div className="mt-8">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-primary" />
                        <span>Assign New Membership</span>
                      </h4>
                      
                      <Card className="border border-dashed shadow-none hover:border-primary/20 transition-colors group">
                        <CardContent className="p-4 pt-4">
                          {availableTiers.length > 0 ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-grow">
                                <Label htmlFor="tier-select" className="text-xs mb-1.5 block text-muted-foreground">
                                  Membership Tier
                                </Label>
                                <Select 
                                  value={selectedTierId || ""} 
                                  onValueChange={handleTierSelection}
                                  disabled={isAssigning}
                                >
                                  <SelectTrigger id="tier-select" className="flex-grow bg-background">
                                    <SelectValue placeholder="Select a tier..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableTiers.map((tier) => (
                                      <SelectItem key={tier.id} value={tier.id}>
                                        <div className="flex justify-between items-center w-full">
                                          <span>{tier.name}</span>
                                          <span className="text-xs text-muted-foreground ml-2">
                                            {tier.currency} {(tier.price / 100).toFixed(2)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="sm:self-end">
                                <Button 
                                  onClick={handleAssignMembership}
                                  disabled={!selectedTierId || isAssigning}
                                  className="px-4 h-10 sm:w-auto w-full"
                                >
                                  {isAssigning ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                  )}
                                  Assign Membership
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs flex items-center gap-2 text-muted-foreground border rounded-md p-3 bg-muted/10">
                              <Info className="h-4 w-4" />
                              <p>No active membership tiers available to assign.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="px-6 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowConfirmation(false)}
                        className="hover:bg-transparent p-0 h-auto"
                      >
                        <ChevronRight className="h-4 w-4 mr-1 transform rotate-180" />
                        <span>Back</span>
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Assign Membership</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assign a membership to {userName}
                    </p>
                  </div>
                  
                  {selectedTier && (
                    <div className="flex-1 overflow-y-auto px-6">
                      <div className="py-4">
                        <Card className="overflow-hidden border border-primary/20">
                          <CardHeader className="py-3 px-4 bg-primary/5">
                            <CardTitle className="text-sm font-medium flex justify-between">
                              <span>{selectedTier.name}</span>
                              <span className="text-muted-foreground">
                                {selectedTier.currency} {(selectedTier.price / 100).toFixed(2)}
                              </span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 text-sm space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center">
                                <UserIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium">{userName}</p>
                                {user?.profile?.email && (
                                  <p className="text-xs text-muted-foreground">{user.profile.email}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="space-y-5 pb-20">
                        {/* Custom Member ID field */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label htmlFor="memberId" className="text-sm">Member ID</Label>
                            <span className="text-xs text-muted-foreground">Will be auto-generated if empty</span>
                          </div>
                          {existingMemberId ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <Input 
                                  id="memberId" 
                                  value={existingMemberId}
                                  disabled={true}
                                  className="h-9 font-mono text-sm bg-muted/30"
                                />
                                <div className="shrink-0">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle className="h-3 w-3 mr-1" /> Existing
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Info className="h-3 w-3" />
                                <span>This member already has an ID that will be used for this membership</span>
                              </p>
                            </div>
                          ) : (
                            <>
                              <Input 
                                id="memberId" 
                                placeholder="e.g., MEM-2025-001" 
                                value={customMemberId}
                                onChange={(e) => setCustomMemberId(e.target.value)}
                                className="h-9 font-mono text-sm"
                              />
                              {!customMemberId && (
                                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  <span>A unique ID will be automatically generated based on the tier&apos;s format settings</span>
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Default dates display */}
                        <div className="bg-muted/10 p-4 rounded-md border">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium">Membership Period</h4>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="custom-dates" 
                                checked={useCustomDates}
                                onCheckedChange={(checked) => setUseCustomDates(checked as boolean)}
                              />
                              <Label htmlFor="custom-dates" className="text-xs">
                                Override dates
                              </Label>
                            </div>
                          </div>
                          
                          {!useCustomDates ? (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Start Date:</p>
                                <p className="font-medium">{
                                  selectedTier?.membership_tier?.has_fixed_dates && selectedTier?.membership_tier?.fixed_start_date
                                    ? format(new Date(selectedTier.membership_tier.fixed_start_date), 'PP')
                                    : format(new Date(), 'PP')
                                }</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">End Date:</p>
                                <p className="font-medium">{
                                  selectedTier?.membership_tier?.has_fixed_dates && selectedTier?.membership_tier?.fixed_end_date
                                    ? format(new Date(selectedTier.membership_tier.fixed_end_date), 'PP')
                                    : selectedTier?.membership_tier?.duration_months
                                      ? format(new Date(new Date().setMonth(
                                          new Date().getMonth() + 
                                          (selectedTier.membership_tier.duration_unit === 'year' 
                                            ? selectedTier.membership_tier.duration_months * 12 
                                            : selectedTier.membership_tier.duration_months)
                                        )), 'PP')
                                      : 'No end date'
                                }</p>
                              </div>
                              {selectedTier?.membership_tier?.duration_months && (
                                <div className="col-span-2 mt-1 text-xs text-muted-foreground">
                                  Duration: {selectedTier.membership_tier.duration_months} {
                                    selectedTier.membership_tier.duration_unit === 'year' 
                                      ? selectedTier.membership_tier.duration_months > 1 ? 'years' : 'year'
                                      : selectedTier.membership_tier.duration_months > 1 ? 'months' : 'month'
                                  }
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor="start-date" className="text-sm mb-1.5 block">Custom Start Date:</Label>
                                <Input 
                                  id="start-date" 
                                  type="date" 
                                  value={customStartDate}
                                  onChange={(e) => setCustomStartDate(e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <div>
                                <Label htmlFor="end-date" className="text-sm mb-1.5 block">Custom End Date:</Label>
                                <Input 
                                  id="end-date" 
                                  type="date" 
                                  value={customEndDate}
                                  onChange={(e) => setCustomEndDate(e.target.value)}
                                  className="h-9"
                                />
                              </div>
                              <p className="text-xs text-muted-foreground italic">
                                Note: Custom dates override the membership tier&apos;s default duration settings.
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground">
                            This will create a new membership and assign it to the user immediately.
                          </p>
                      
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="border-t p-6 mt-auto bg-background">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => setShowConfirmation(false)}
                        disabled={isAssigning}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={confirmAssignMembership} 
                        className="flex-1 bg-primary hover:bg-primary/90"
                        disabled={isAssigning}
                      >
                        {isAssigning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Assigning...
                          </>
                        ) : (
                          "Assign Membership"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Cancel Membership Confirmation Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>Cancel Membership</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                Are you sure you want to cancel this membership? This action cannot be undone.
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cancel-reason" className="text-sm">Reason (optional)</Label>
                  <textarea
                    id="cancel-reason"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter a reason for cancellation..."
                    className="w-full p-2 border rounded-md text-sm mt-1 h-20 resize-none"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelMembership}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Membership"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Membership Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <XIcon className="h-5 w-5" />
              <span>Delete Membership</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                Are you sure you want to permanently delete this membership? This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMembership}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Membership"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Member ID Modal */}
      {user && isEditingMemberId && (
        <EditMemberIdModal
          isOpen={true}
          setIsOpen={(open) => {
            if (!open) handleMemberIdModalClose();
          }}
          orgId={orgId}
          groupUserId={user.id}
          currentMemberId={user.memberId}
          memberIdsRecordId={user.memberIdsRecordId}
          userName={userName}
          userEmail={user.profile?.email || null}
        />
      )}
    </TooltipProvider>
  );
}

// Helper component for detail items in left panel
function DetailItem({ 
  number, 
  label, 
  value, 
  icon,
  tooltipContent
}: { 
  number: number; 
  label: string; 
  value: React.ReactNode; 
  icon?: React.ReactNode;
  tooltipContent?: string;
}) {
  const content = (
    <div className="bg-gray-50 rounded-md p-3 flex items-center gap-3 hover:bg-gray-100 transition-colors group">
      <div className="bg-gray-800 rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium text-white">
        {number}
      </div>
      <div className="flex flex-grow justify-between items-center">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="text-sm text-gray-500">{label}</span>
        </div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );

  if (tooltipContent) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
} 