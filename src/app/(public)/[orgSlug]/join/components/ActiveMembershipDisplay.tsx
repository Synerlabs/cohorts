import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle2, Calendar, ChevronRight, Info } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/formatters";

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
  
  return (
    <div className="container max-w-5xl py-12 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Your Active Membership</h1>
          <p className="text-base text-muted-foreground mb-8">
            You already have an active membership with this organization.
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
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800">
              <div className="flex gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-medium mb-1">Active Status</h4>
                  <p className="text-sm">
                    You already have an active membership with this organization. You can view your dashboard to access member benefits.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/@${orgSlug}`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Home
                </Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href={`/@${orgSlug}/dashboard`}>
                  Go to Dashboard
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 