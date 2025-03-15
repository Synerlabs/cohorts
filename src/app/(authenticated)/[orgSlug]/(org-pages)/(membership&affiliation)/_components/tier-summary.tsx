import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Pencil, Users, Building, CreditCard, Settings, CheckSquare, AlertCircle, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TierSummaryProps {
  stats: {
    active_members: number;
    expiring_soon: number;
    pending_applications: number;
    pending_reviews: number;
    pending_payments: number;
    payments_pending_review?: number;
  };
  requiresForm: boolean;
  requiresReview: boolean;
  price: number;
  memberIdFormat: string;
  onEditMemberId?: () => void;
  type: 'membership' | 'organization';
  tierId?: string;
  orgSlug?: string;
}

export function TierSummary({
  stats,
  requiresForm,
  requiresReview,
  price,
  memberIdFormat,
  onEditMemberId,
  type,
  tierId,
  orgSlug
}: TierSummaryProps) {
  const router = useRouter();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Add debug logging
  React.useEffect(() => {
    console.log('TierSummary - received stats:', stats);
    console.log('TierSummary - tier type:', type);
    console.log('TierSummary - tier ID:', tierId);
  }, [stats, type, tierId]);

  // Function to navigate to applications with filtered view
  const viewPaymentsForReview = () => {
    if (orgSlug && tierId) {
      router.push(`/${orgSlug}/applications?filter=pending_approval&tierId=${tierId}`);
    }
  };

  return (
    <Card className="p-4 sm:p-6 overflow-hidden transition-all duration-200 hover:shadow-md">
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
            className="h-6 text-xs transition-colors hover:bg-slate-100 active:scale-95" 
            onClick={onEditMemberId}
          >
            <Settings className="h-3 w-3 mr-1" />
            ID Settings
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Member Stats */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center text-slate-600">
              <Users className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Member Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-md p-3 bg-background hover:border-primary/30 hover:bg-primary/5 transition-colors duration-200">
                <p className="text-xl sm:text-2xl font-semibold text-slate-800">
                  {stats.active_members}
                </p>
                <p className="text-sm text-slate-500">Active members</p>
              </div>
              <div className="border rounded-md p-3 bg-background hover:border-amber-300 hover:bg-amber-50/50 transition-colors duration-200">
                <p className="text-xl sm:text-2xl font-semibold text-slate-800">
                  {stats.expiring_soon}
                </p>
                <p className="text-sm text-slate-500">
                  {stats.expiring_soon > 0 ? (
                    <span className="flex items-center">
                      <span>Expiring soon</span>
                      {stats.expiring_soon > 0 && (
                        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </span>
                  ) : (
                    "Expiring soon"
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Pending Actions */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center text-slate-600">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              Pending Actions
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {requiresForm && (
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background",
                    "transition-all duration-200",
                    hoveredAction === 'applications' 
                      ? "border-blue-300 bg-blue-50/50 shadow-sm" 
                      : "hover:border-blue-200 hover:bg-blue-50/30"
                  )}
                  onMouseEnter={() => setHoveredAction('applications')}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "p-1 rounded-full transition-colors",
                      hoveredAction === 'applications' ? "bg-blue-100" : "bg-blue-50"
                    )}>
                      <FileText className={cn(
                        "h-4 w-4 transition-colors",
                        hoveredAction === 'applications' ? "text-blue-600" : "text-blue-500"
                      )} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Applications</span>
                  </div>
                  {stats.pending_applications > 0 ? (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "font-mono transition-colors",
                        hoveredAction === 'applications' 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-blue-50 text-blue-700"
                      )}
                    >
                      {stats.pending_applications}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              )}

              {/* Reviews section for membership tiers */}
              {requiresReview && type !== 'organization' && (
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background",
                    "transition-all duration-200",
                    hoveredAction === 'reviews' 
                      ? "border-indigo-300 bg-indigo-50/50 shadow-sm" 
                      : "hover:border-indigo-200 hover:bg-indigo-50/30"
                  )}
                  onMouseEnter={() => setHoveredAction('reviews')}
                  onMouseLeave={() => setHoveredAction(null)}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "p-1 rounded-full transition-colors",
                      hoveredAction === 'reviews' ? "bg-indigo-100" : "bg-indigo-50"
                    )}>
                      <Shield className={cn(
                        "h-4 w-4 transition-colors",
                        hoveredAction === 'reviews' ? "text-indigo-600" : "text-indigo-500"
                      )} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Reviews</span>
                  </div>
                  {stats.pending_reviews > 0 ? (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "font-mono transition-colors",
                        hoveredAction === 'reviews' 
                          ? "bg-indigo-100 text-indigo-800" 
                          : "bg-indigo-50 text-indigo-700"
                      )}
                    >
                      {stats.pending_reviews}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">None</span>
                  )}
                </div>
              )}

              {/* Payments for Review section for all tier types */}
              {stats.payments_pending_review !== undefined && (
                <div 
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 sm:px-4 py-2 bg-background",
                    "transition-all duration-200",
                    stats.payments_pending_review > 0 ? "relative" : "",
                    hoveredAction === 'payments' 
                      ? "border-emerald-300 bg-emerald-50/50 shadow-sm" 
                      : stats.payments_pending_review > 0
                        ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300 hover:bg-emerald-50/50"
                        : "hover:border-emerald-200 hover:bg-emerald-50/30"
                  )}
                  onMouseEnter={() => setHoveredAction('payments')}
                  onMouseLeave={() => setHoveredAction(null)}
                  onClick={stats.payments_pending_review > 0 ? viewPaymentsForReview : undefined}
                  style={{ cursor: stats.payments_pending_review > 0 ? 'pointer' : 'default' }}
                >
                  {/* Attention indicator dot */}
                  {stats.payments_pending_review > 0 && (
                    <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 h-2.5 w-2.5 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                  
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn(
                      "p-1 rounded-full transition-colors",
                      hoveredAction === 'payments' ? "bg-emerald-100" : "bg-emerald-50"
                    )}>
                      <CreditCard className={cn(
                        "h-4 w-4 transition-colors",
                        hoveredAction === 'payments' ? "text-emerald-600" : "text-emerald-500"
                      )} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Payments for Review</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {stats.payments_pending_review > 0 ? (
                      <>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "font-mono transition-colors",
                            hoveredAction === 'payments' 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {stats.payments_pending_review}
                        </Badge>
                        {hoveredAction === 'payments' && (
                          <ChevronRight className="h-4 w-4 text-emerald-500 ml-1 animate-bounce-x" />
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </div>
                </div>
              )}

              {!requiresForm && !requiresReview && price === 0 && type !== 'organization' && stats.payments_pending_review === 0 && (
                <div className="flex items-center justify-center h-[88px] rounded-md border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2 text-slate-400" />
                    No pending actions
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add animation keyframes for bounce-x animation */}
      <style jsx global>{`
        @keyframes bounce-x {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(3px);
          }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
      `}</style>
    </Card>
  );
} 