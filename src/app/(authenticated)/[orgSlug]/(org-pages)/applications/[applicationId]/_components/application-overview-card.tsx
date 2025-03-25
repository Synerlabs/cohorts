import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationStatusBadgeVariant } from "@/lib/utils/badges";
import { formatPrice, CurrencyCode } from "@/lib/utils/price";
import { formatDate } from "@/lib/utils";
import { Application } from "@/services/application.service";
import { ApplicationActions } from "../../_components/application-actions";
import { Calendar, CreditCard, Clock, User, Package, Receipt, History, ArrowUpRight, ChevronRight, Mail, Phone, Check, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

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
  
  // Helper to get status icon
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'approved':
        return <Check className="h-3.5 w-3.5" />;
      case 'rejected':
        return <X className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Combined Application Overview Card */}
      <Card>
        {/* Status Header */}
        <div className={`px-6 py-3 ${application.status === 'approved' ? 'bg-green-50 border-b border-green-200' : 
                      application.status === 'rejected' ? 'bg-red-50 border-b border-red-200' :
                      application.status.includes('pending') ? 'bg-amber-50 border-b border-amber-200' : 'bg-blue-50 border-b border-blue-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant={getApplicationStatusBadgeVariant(application.status)} 
                className="px-2.5 py-0.5 font-medium"
              >
                <span className="flex items-center gap-1.5">
                  {getStatusIcon(application.status)}
                  {application.status.replace('_', ' ').toUpperCase()}
                </span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                Last updated: {formatDate(application.submitted_at)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Applicant Info */}
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 border">
              <AvatarFallback className="text-lg bg-primary/10">
                {application.user_data.full_name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
              <AvatarImage src={`https://avatar.vercel.sh/${application.user_data.email}?size=64`} />
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{application.user_data.full_name}</h3>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{application.user_data.email}</span>
                </p>
                {/* Phone would come from extended user data in a real implementation */}
              </div>
              <div className="mt-3">
                <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                  <Link href={`#`}>
                    <User className="h-3.5 w-3.5 mr-1.5" />
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Application Details
              </h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      ID: <span className="font-medium">{application.id.substring(0, 8)}...</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{application.id}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Submitted On</p>
                <p className="text-sm font-medium">{formatDate(application.submitted_at)}</p>
              </div>
            </div>
          
            {/* Membership Details */}
            <div className="pt-6 border-t">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                <Package className="h-4 w-4 text-primary" />
                Membership Details
              </h4>
              
              <div className="space-y-4">
                {/* Tier - Prominent display */}
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                  <p className="text-xs text-muted-foreground mb-1">Selected Tier</p>
                  <p className="text-sm font-semibold">{application.product_name}</p>
                </div>

                {/* Price and Duration - Grid for better alignment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Price</p>
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {formatPrice(application.product_price, application.product_currency as CurrencyCode)}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {application.duration_months} months
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activation Type */}
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Activation</p>
                  <p className="text-sm font-medium">
                    {application.activation_type.replace(/_/g, ' ').toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Payment History Card */}
      {mockPayments && mockPayments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {mockPayments.map(payment => (
              <div key={payment.id} 
                className="bg-muted/40 rounded-lg p-3 border border-muted hover:border-muted-foreground/30 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <Badge 
                      variant={payment.status === "paid" ? "default" : "outline"} 
                      className={`text-xs mb-2 ${payment.status === "paid" ? "bg-green-100 hover:bg-green-200 text-green-800 hover:text-green-900" : ""}`}
                    >
                      {payment.status.toUpperCase()}
                    </Badge>
                    <p className="text-sm font-medium">
                      {formatPrice(payment.amount, payment.currency)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-70 group-hover:opacity-100" asChild>
                    <Link href={`#`}>
                      <span className="sr-only">View payment details</span>
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
            
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground" asChild>
              <Link href={`#`}>
                <span>View all payments</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Application History Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Application History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative pl-5 border-l-2 border-primary/20 space-y-4">
            {mockHistory.map((item, index) => (
              <div key={item.id} className="relative">
                {/* Timeline dot - more visually distinct */}
                <div className={`absolute w-3.5 h-3.5 rounded-full 
                  ${item.status === 'approved' ? 'bg-green-500' : 
                    item.status === 'rejected' ? 'bg-red-500' : 
                    'bg-primary'} 
                  -left-[27px] top-1 ring-4 ring-background`}>
                </div>
                
                <div className="pb-4">
                  <p className="text-sm font-medium flex items-center">
                    {item.action}
                    {index === 0 && <Badge className="ml-2 text-[10px] bg-primary/10 text-primary border-primary/20">Latest</Badge>}
                  </p>
                  
                  {item.status && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center flex-wrap gap-1">
                      Status changed to 
                      <Badge 
                        variant={getApplicationStatusBadgeVariant(item.status as any)} 
                        className="text-[10px] h-4 px-1.5"
                      >
                        {item.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </p>
                  )}
                  
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span className="font-medium">{item.user}</span>
                    <span>{formatDate(item.date)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground -ml-5 mt-2" asChild>
              <Link href={`#`}>
                <span>View complete history</span>
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Application Actions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Application Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ApplicationActions
            applicationId={application.id}
            status={application.status}
            activationType={application.activation_type}
            price={application.product_price}
            userPermissions={userPermissions}
          />
        </CardContent>
      </Card>
    </div>
  );
} 