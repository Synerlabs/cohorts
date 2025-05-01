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
import { useEffect, useState, useTransition, useCallback } from "react";
import { format } from 'date-fns';
import { getTierAndMembershipDataForUser, assignMembershipAction } from "../../(membership&affiliation)/_actions/membership.action"; // Correctly imports assignMembershipAction now
import { IMembershipTierProduct } from '@/lib/types/product'; // Import type
import type { MembershipWithTierAndProductName } from '../../(membership&affiliation)/_actions/membership.action'; // Import the specific type defined in the action file
import { Loader2, CheckCircle, XCircle, Info, PlusCircle, XIcon, AlignLeft, Calendar, User as UserIcon, Receipt, RefreshCcw, ClipboardCopy, ChevronRight } from "lucide-react"; // Added more icons
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
  const { toast } = useToast(); // Get toast function from the hook

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

  const handleAssignMembership = () => {
    if (!selectedTierId || !user) return;
    
    // Show confirmation dialog instead of immediately assigning
    setShowConfirmation(true);
  };

  const confirmAssignMembership = () => {
    if (!selectedTierId || !user) return;
    
    setShowConfirmation(false); // Close confirmation dialog
    
    startAssignTransition(async () => {
      try {
        const result = await assignMembershipAction(user.userId, orgId, selectedTierId);
        if (!result.success) throw new Error(result.error || "Failed to assign membership");
        
        // Use the imported toast function with standard structure
        toast({ 
          title: "Membership Assigned",
          description: `Successfully assigned membership to ${userName}.`,
        });
        
        setSelectedTierId(null); // Reset selection
        
        // Re-fetch memberships after successful assignment
        await refreshMemberships();
      } catch (err) {
        console.error("Failed to assign membership:", err);
        // Use the imported toast function for errors
        toast({ 
          title: "Assignment Failed",
          description: err instanceof Error ? err.message : "An unknown error occurred.",
          variant: "destructive", // Use destructive variant for errors
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
                  <p className="text-sm text-gray-500">ID:</p>
                  <p className="text-sm font-medium">
                    {user.memberId ? `#${user.memberId}` : '#MEM-2025-001'}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-5 w-5 rounded-full" 
                    title="Edit ID (coming soon)"
                  >
                    <ClipboardCopy className="h-3 w-3 text-gray-400" />
                  </Button>
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
              <div className="p-4 sm:p-6 pt-20 space-y-6">
                {/* Membership Header with Refresh */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">Memberships</h3>
                  </div>
                  
                  {!isLoading && !isRefreshing && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={refreshMemberships}
                      className="h-8 gap-1 text-xs group"
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
                  <div className="space-y-3">
                    {userMemberships.length > 0 ? (
                      userMemberships.map((membership, index) => (
                        <Card 
                          key={membership.id} 
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
                                "flex h-5 w-5 rounded-full items-center justify-center text-xs font-medium",
                                membership.status === 'active' ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                              )}>
                                {index + 1}
                              </div>
                              <CardTitle className="text-sm font-medium">
                                {membership.membership_tier?.product?.name || 'Unknown Tier'}
                              </CardTitle>
                            </div>
                            <Badge 
                              variant={membership.status === 'active' ? 'default' : 'outline'}
                              className={membership.status === 'active' ? 'bg-green-500 text-white' : ''}
                            >
                              {membership.status}
                            </Badge>
                          </CardHeader>
                          <CardContent className="p-4 pt-3 text-sm">
                            <div className="grid grid-cols-2 gap-y-2 text-xs">
                              {membership.member_id && (
                                <>
                                  <span className="text-muted-foreground">Membership ID:</span>
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
                              <span className="text-muted-foreground">Start Date:</span>
                              <span className="font-medium">{membership.start_date ? format(new Date(membership.start_date), 'PP') : '-'}</span>
                              <span className="text-muted-foreground">End Date:</span>
                              <span className="font-medium">{membership.end_date ? format(new Date(membership.end_date), 'PP') : '-'}</span>
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{membership.created_at ? format(new Date(membership.created_at), 'PP') : '-'}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="flex flex-col items-center text-sm text-muted-foreground py-12 border rounded-md bg-muted/10 text-center gap-2 animate-in fade-in-50">
                        <Info className="h-5 w-5 text-muted-foreground" />
                        <p>This user has no memberships in this organization.</p>
                        <p className="text-xs text-muted-foreground mt-1">Use the form below to assign a membership.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Section */}
                {!isLoading && !error && (
                  <Card className="mt-4 border border-dashed shadow-none hover:border-primary/20 transition-colors group">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                        <CardTitle className="text-sm font-medium">Assign New Membership</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {availableTiers.length > 0 ? (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Select 
                            value={selectedTierId || ""} 
                            onValueChange={setSelectedTierId}
                            disabled={isAssigning}
                          >
                            <SelectTrigger className="flex-grow bg-background">
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
                          <Button 
                            onClick={handleAssignMembership}
                            disabled={!selectedTierId || isAssigning}
                            className="px-4 sm:w-auto w-full"
                          >
                            {isAssigning ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <PlusCircle className="h-4 w-4 mr-2" />
                            )}
                            Assign
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs flex items-center gap-2 text-muted-foreground border rounded-md p-3 bg-muted/10">
                          <Info className="h-4 w-4" />
                          <p>No active membership tiers available to assign.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Membership</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedTier && (
                <div className="space-y-2">
                  <p>
                    Are you sure you want to assign the <strong>{selectedTier.name}</strong> membership 
                    to <strong>{userName}</strong>?
                  </p>
                  <Card className="mt-2 overflow-hidden border border-primary/20">
                    <CardHeader className="py-2 px-3 bg-primary/5">
                      <CardTitle className="text-sm font-medium">{selectedTier.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-2 text-sm space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Price:</span>
                        <span className="font-medium">{selectedTier.currency} {(selectedTier.price / 100).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">User:</span>
                        <span className="font-medium truncate max-w-[200px]">{userName}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignMembership}>
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Membership"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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