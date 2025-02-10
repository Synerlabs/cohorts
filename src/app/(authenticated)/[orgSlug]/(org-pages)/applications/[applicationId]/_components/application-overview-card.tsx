import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice, CurrencyCode } from "@/lib/utils/price";
import { formatDate } from "@/lib/utils";
import { Application } from "@/services/application.service";
import { ApplicationActions } from "../../_components/application-actions";

interface ApplicationOverviewCardProps {
  application: Application;
  userPermissions?: string[];
}

export function ApplicationOverviewCard({ application, userPermissions = [] }: ApplicationOverviewCardProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="text-lg">
              {application.user_data.full_name.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium text-lg">{application.user_data.full_name}</h3>
            <p className="text-sm text-muted-foreground">{application.user_data.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Application Status */}
        <div className="grid gap-6 border-t pt-6">
          <div className="grid grid-cols-1 gap-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Status</p>
              <Badge variant={getApplicationStatusBadgeVariant(application.status)} className="text-xs">
                {application.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Submitted</p>
              <p className="text-sm">
                {formatDate(application.submitted_at)}
              </p>
            </div>
            {/* Action Buttons */}
            <ApplicationActions
              applicationId={application.id}
              status={application.status}
              activationType={application.activation_type}
              price={application.product_price}
              userPermissions={userPermissions}
            />
          </div>
        </div>

        {/* Membership Details */}
        <div className="grid gap-6 border-t pt-6">
          <h4 className="font-medium">Membership Details</h4>
          <div className="grid grid-cols-1 gap-y-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Tier</p>
              <p className="text-sm">{application.product_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Price</p>
              <p className="text-sm">
                {formatPrice(application.product_price, application.product_currency as CurrencyCode)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Duration</p>
              <p className="text-sm">
                {application.duration_months} months
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1.5">Activation Type</p>
              <p className="text-sm">
                {application.activation_type.replace(/_/g, ' ').toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 