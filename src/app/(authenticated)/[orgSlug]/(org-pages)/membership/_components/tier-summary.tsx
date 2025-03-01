import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Shield } from "lucide-react";

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
}

export function TierSummary({
  stats,
  requiresForm,
  requiresReview,
  price
}: TierSummaryProps) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Tier Summary</h2>
            <p className="text-sm text-muted-foreground">
              Overview and current activity
            </p>
          </div>
        </div>
        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Member Stats */}
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Members</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {stats.active_members}
                  </p>
                  <p className="text-sm text-muted-foreground">Active members</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold">
                    {stats.expiring_soon}
                  </p>
                  <p className="text-sm text-muted-foreground">Expiring soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Pending Actions</h3>
            <div className="space-y-2 sm:space-y-3">
              {requiresForm && (
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
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
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
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
                <div className="flex items-center justify-between rounded-md border px-3 sm:px-4 py-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
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
                <div className="flex items-center justify-center h-[100px] sm:h-[120px] rounded-md border-2 border-dashed">
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