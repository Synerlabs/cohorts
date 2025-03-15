import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Pencil, Users, Building, CreditCard, Settings } from "lucide-react";

interface TierSummaryProps {
  stats: {
    active_members: number;
    expiring_soon: number;
    pending_applications: number;
    pending_reviews: number;
    pending_payments: number;
  };
  requiresForm: boolean;
  requiresReview: boolean;
  price: number;
  memberIdFormat: string;
  onEditMemberId?: () => void;
  type: 'membership' | 'organization';
}

export function TierSummary({
  stats,
  requiresForm,
  requiresReview,
  price,
  memberIdFormat,
  onEditMemberId,
  type
}: TierSummaryProps) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-5">
        {/* Compact Tier Type Info */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            {type === 'membership' ? (
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Users className="h-4 w-4 text-primary" />
              </div>
            ) : (
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Building className="h-4 w-4 text-primary" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">
                  {type === 'membership' ? 'Individual Membership' : 'Organization Affiliation'}
                </h3>
                <Badge 
                  variant={type === 'membership' ? 'default' : 'secondary'} 
                  className="text-xs px-1.5"
                >
                  {type === 'membership' ? 'Individual' : 'Organization'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {type === 'membership' 
                  ? 'For personal accounts with individual access' 
                  : 'For organizational partnerships and affiliations'}
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs" 
            onClick={onEditMemberId}
          >
            <Settings className="h-3 w-3 mr-1" />
            ID Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Member Stats */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Member Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-md p-3 bg-background">
                <p className="text-xl sm:text-2xl font-semibold">
                  {stats.active_members}
                </p>
                <p className="text-sm text-muted-foreground">Active members</p>
              </div>
              <div className="border rounded-md p-3 bg-background">
                <p className="text-xl sm:text-2xl font-semibold">
                  {stats.expiring_soon}
                </p>
                <p className="text-sm text-muted-foreground">Expiring soon</p>
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Pending Actions</h3>
            <div className="space-y-2 sm:space-y-3">
              {requiresForm && (
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm">Applications</span>
                  </div>
                  {stats.pending_applications > 0 ? (
                    <Badge variant="secondary" className="font-mono">
                      {stats.pending_applications}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              )}

              {requiresReview && (
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">Reviews</span>
                  </div>
                  {stats.pending_reviews > 0 ? (
                    <Badge variant="secondary" className="font-mono">
                      {stats.pending_reviews}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              )}

              {price > 0 && (
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-sm">Payments</span>
                  </div>
                  {stats.pending_payments > 0 ? (
                    <Badge variant="secondary" className="font-mono">
                      {stats.pending_payments}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              )}

              {!requiresForm && !requiresReview && price === 0 && (
                <div className="flex items-center justify-center h-[88px] rounded-md border-2 border-dashed">
                  <p className="text-sm text-muted-foreground">
                    No pending actions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
} 