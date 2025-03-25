import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice, CurrencyCode } from "@/lib/utils/price";
import { formatDate } from "@/lib/utils";
import { Application } from "@/services/application.service";
import { ApplicationActions } from "../../_components/application-actions";
import { Calendar, CreditCard, Clock, User, Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ApplicationOverviewCardProps {
  application: Application;
  userPermissions?: string[];
}

export function ApplicationOverviewCard({ application, userPermissions = [] }: ApplicationOverviewCardProps) {
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