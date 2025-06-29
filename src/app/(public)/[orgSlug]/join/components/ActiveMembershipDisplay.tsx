"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Calendar, ChevronRight, Info, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { cancelMembership } from "../_actions/cancel-membership";

interface ActiveMembershipDisplayProps {
  membership: {
    id: string;
    status: string;
    start_date: string;
    end_date: string | null;
    created_at: string;
    is_active: boolean;
    product: {
      id: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      membership_tiers: {
        activation_type: any;
        duration_months: any;
        member_id_format: any;
      };
    };
  };
  orgSlug: string;
}

export function ActiveMembershipDisplay({ membership, orgSlug }: ActiveMembershipDisplayProps) {
  const [cancellationPending, setCancellationPending] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Format dates for display
  const startDate = new Date(membership.start_date);
  const formattedStartDate = format(startDate, 'MMMM d, yyyy');
  
  // Format end date if it exists
  const endDate = membership.end_date ? new Date(membership.end_date) : null;
  const formattedEndDate = endDate ? format(endDate, 'MMMM d, yyyy') : 'No end date';
  
  // Calculate membership duration
  const today = new Date();
  const memberSince = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const memberSinceDisplay = memberSince === 0 ? 'Today' : `${memberSince} days`;
  
  // Format membership price
  const membershipPrice = formatCurrency(membership.product.price, membership.product.currency);

  // Function to handle membership cancellation
  const handleCancelMembership = async () => {
    try {
      console.log("Starting membership cancellation for:", {
        membershipId: membership.id,
        orgSlug: orgSlug
      });
      
      setCancellationPending(true);
      
      // Call the server action to cancel the membership
      console.log("Calling server action cancelMembership...");
      const result = await cancelMembership(membership.id, orgSlug);
      console.log("Server action result:", result);
      
      toast({
        title: result.success ? "Membership Cancelled" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.success) {
        console.log("Cancellation successful, refreshing page...");
        // Force a hard refresh to the join page to ensure we see the updated state
        window.location.href = `/@${orgSlug}/join`;
      } else {
        // Just refresh the current page if there was an error
        router.refresh();
      }
    } catch (error) {
      console.error("Error cancelling membership:", error);
      toast({
        title: "Error",
        description: "There was an error cancelling your membership. Please try again later.",
        variant: "destructive",
      });
      router.refresh();
    } finally {
      setCancellationPending(false);
    }
  };
  
  return (
    <div className="container max-w-5xl py-12 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Active Membership</h1>
        <p className="text-base text-muted-foreground mb-8">
          You have an active membership with this organization.
        </p>
      </div>
      
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Current Membership</CardTitle>
              <CardDescription>
                Your membership details
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex gap-1.5 items-center px-2.5 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Active</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Membership Tier</span>
              <span className="font-semibold">{membership.product.name}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Start Date</span>
              <span className="font-medium text-muted-foreground">{formattedStartDate}</span>
            </div>
            
            {endDate && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">End Date</span>
                  <span className="font-medium text-muted-foreground">{formattedEndDate}</span>
                </div>
              </>
            )}
            
            <Separator />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Member For</span>
              <span className="font-medium text-muted-foreground">{memberSinceDisplay}</span>
            </div>
            
            {membership.product.price > 0 && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Membership Fee</span>
                  <span className="font-semibold">{membershipPrice}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" asChild>
              <Link href={`/@${orgSlug}/dashboard`}>
                <Calendar className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/@${orgSlug}/join?viewAll=true`}>
                <Search className="mr-2 h-4 w-4" />
                View All Memberships
              </Link>
            </Button>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                <AlertCircle className="mr-2 h-4 w-4" />
                Cancel Membership
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Your Membership</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel your {membership.product.name} membership? 
                  You will lose access to member benefits immediately.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Membership</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleCancelMembership}
                  disabled={cancellationPending}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {cancellationPending ? "Processing..." : "Yes, Cancel Membership"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800 max-w-lg mx-auto">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Looking for a different membership?</h4>
            <p className="text-sm">
              You can view other membership options while keeping your current active membership.
              Click &quot;View All Memberships&quot; to see what&apos;s available.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 