import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice, CurrencyCode } from "@/lib/utils/price";
import { formatDate } from "@/lib/utils";
import { Application } from "@/services/application.service";
import { ApplicationActions } from "../../_components/application-actions";
import { Calendar, CreditCard, Clock, User, Package, Receipt, History, ArrowUpRight, InfoIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ApplicationOverviewCardProps {
  application: Application;
  userPermissions?: string[];
}

export function ApplicationOverviewCard({ application, userPermissions = [] }: ApplicationOverviewCardProps) {
  // Mock payment data for example - in a real implementation, this would come from an API call
  const mockPayments = [
    {
      id: "pay_123456",
      status: "paid",
      amount: application.product_price,
      currency: application.product_currency as CurrencyCode,
      date: new Date().toISOString(),
      method: "Credit Card"
    }
  ];

  // Mock history data for example - in a real implementation, this would come from an API call
  const mockHistory = [
    {
      id: "hist_1",
      action: "Application submitted",
      date: application.submitted_at,
      user: application.user_data.full_name
    },
    {
      id: "hist_2",
      action: "Application status updated",
      date: new Date(new Date(application.submitted_at).getTime() + 24*60*60*1000).toISOString(),
      status: application.status,
      user: "Admin User"
    }
  ];

  return (
    <Card>
      <CardContent className="p-6">
        {/* Status Badge - Prominent at the top */}
        <Badge 
          variant={getApplicationStatusBadgeVariant(application.status)} 
          className="mb-6 px-2.5 py-1"
        >
          {application.status.replace('_', ' ').toUpperCase()}
        </Badge>

        {/* Applicant Info */}
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg bg-primary/10">
              {application.user_data.full_name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{application.user_data.full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">{application.user_data.email}</p>
          </div>
        </div>

        {/* Application Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Submitted on</span>
            <span className="font-medium">{formatDate(application.submitted_at)}</span>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Membership Details */}
        <div className="space-y-6">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-primary" />
            Membership Details
          </h4>
          
          <div className="grid gap-4">
            <div className="space-y-4">
              {/* Tier */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Selected Tier</p>
                <p className="text-sm font-medium">{application.product_name}</p>
              </div>

              {/* Price and Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Price</p>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {formatPrice(application.product_price, application.product_currency as CurrencyCode)}
                    </p>
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Duration</p>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      {application.duration_months} months
                    </p>
                  </div>
                </div>
              </div>

              {/* Activation Type */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Activation</p>
                <p className="text-sm font-medium">
                  {application.activation_type.replace(/_/g, ' ').toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment History Section */}
        {mockPayments && mockPayments.length > 0 && (
          <>
            <Separator className="my-6" />
            
            <div className="space-y-6">
              <h4 className="font-medium flex items-center gap-2 text-sm">
                <Receipt className="h-4 w-4 text-primary" />
                Payment History
              </h4>
              
              <div className="space-y-3">
                {mockPayments.map(payment => (
                  <div key={payment.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <Badge variant={payment.status === "paid" ? "default" : "outline"} className="text-xs mb-2">
                          {payment.status.toUpperCase()}
                        </Badge>
                        <p className="text-sm font-medium">
                          {formatPrice(payment.amount, payment.currency)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <Link href={`#`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{payment.method}</span>
                      <span>{formatDate(payment.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {/* Application History Section */}
        <Separator className="my-6" />
        
        <div className="space-y-6">
          <h4 className="font-medium flex items-center gap-2 text-sm">
            <History className="h-4 w-4 text-primary" />
            Application History
          </h4>
          
          <div className="space-y-4">
            <div className="relative pl-5 border-l border-muted-foreground/20 space-y-4">
              {mockHistory.map((item, index) => (
                <div key={item.id} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute w-2.5 h-2.5 rounded-full bg-primary -left-[21px] top-1"></div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    
                    {item.status && (
                      <p className="text-xs text-muted-foreground">
                        Status changed to <Badge variant={getApplicationStatusBadgeVariant(item.status as any)} className="text-[10px] h-4 px-1.5">{item.status.replace('_', ' ').toUpperCase()}</Badge>
                      </p>
                    )}
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.user}</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-6 border-t">
          <ApplicationActions
            applicationId={application.id}
            status={application.status}
            activationType={application.activation_type}
            price={application.product_price}
            userPermissions={userPermissions}
          />
        </div>
      </CardContent>
    </Card>
  );
} 