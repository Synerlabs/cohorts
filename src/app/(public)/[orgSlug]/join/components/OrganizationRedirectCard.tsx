'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Building, Check, ShieldCheck } from "lucide-react";
import { Currency } from "@/lib/types/membership";

interface OrganizationRedirectCardProps {
  tier: IMembershipTierProduct;
  groupId: string;
  userId: string;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

export function OrganizationRedirectCard({ tier, groupId, userId }: OrganizationRedirectCardProps) {
  const router = useRouter();
  
  // Currency symbol
  const currencySymbol = tier.currency ? 
    (currencySymbols[tier.currency as Currency] || '$') : 
    '$';
    
  const handleRedirect = () => {
    // Create query params
    const queryParams = new URLSearchParams();
    queryParams.set('tierId', tier.id);
    queryParams.set('groupId', groupId);
    queryParams.set('userId', userId);
    
    // Get organization slug from the URL path
    const orgSlug = window.location.pathname.split('/')[1];
    
    // Redirect to the organization selection page
    router.push(`/${orgSlug}/join/select-organization?${queryParams.toString()}`);
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-muted/80 relative">
      {/* Premium corner accent */}
      <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
        <div className="absolute rotate-45 bg-gradient-to-r from-primary/70 to-primary w-16 h-4 -top-2 right-0"></div>
      </div>
      
      {/* Header with Gradient Accent */}
      <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60"></div>
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Building className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-xl md:text-2xl">
                {tier.name}
              </CardTitle>
              {tier.price === 0 && (
                <Badge variant="outline" className="ml-2 text-emerald-600 border-emerald-200 bg-emerald-50 font-medium">
                  Free
                </Badge>
              )}
            </div>
            {tier.description && (
              <CardDescription className="mt-1 text-sm max-w-md">
                {tier.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Price section with improved styling */}
        <div className="flex items-baseline bg-gradient-to-r from-slate-50 to-transparent p-4 rounded-lg border border-slate-200">
          <div className="text-3xl md:text-4xl font-bold">
            {tier.price === 0 ? (
              <span className="text-emerald-600">Free</span>
            ) : (
              <>
                {currencySymbol}
                {(tier.price / 100).toFixed(2)}
              </>
            )}
          </div>
          {tier.membership_tier?.duration_months && tier.price > 0 && (
            <div className="text-sm text-muted-foreground ml-2">
              {tier.membership_tier?.duration_months === 1
                ? "per month"
                : `for ${tier.membership_tier?.duration_months} months`}
            </div>
          )}
        </div>
        
        {/* Features section */}
        <div className="space-y-3 p-4 bg-indigo-50 bg-opacity-50 rounded-lg border border-indigo-100">
          <h4 className="text-sm font-medium flex items-center text-indigo-800">
            <ShieldCheck className="h-4 w-4 mr-2 text-indigo-600" />
            Organization Benefits
          </h4>
          <ul className="grid gap-2 text-sm">
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Official affiliation with {tier.name}</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Access to organization-specific resources</span>
            </li>
            <li className="flex items-start">
              <Check className="h-4 w-4 text-indigo-600 mr-2 mt-0.5 flex-shrink-0" />
              <span className="text-slate-700">Cross-promotion opportunities</span>
            </li>
          </ul>
        </div>
        
        {/* Action Button */}
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
          onClick={handleRedirect}
        >
          <Building className="mr-2 h-5 w-5" />
          Select or Create Organization
        </Button>
      </CardContent>
    </Card>
  );
} 