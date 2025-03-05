"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Users, Building2, ArrowRight } from "lucide-react";
import { MembershipFormType } from "./membership-form";

interface SubscriptionPlanSelectionProps {
  onSelect: (type: MembershipFormType) => void;
  onClose: (open: boolean) => void;
}

export default function SubscriptionPlanSelection({ onSelect, onClose }: SubscriptionPlanSelectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Create Subscription Plan</h2>
        <p className="text-muted-foreground">Choose the type of subscription plan you want to create.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer" 
              onClick={() => onSelect(MembershipFormType.MEMBER)}>
          <CardHeader>
            <Users className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Membership Plan</CardTitle>
            <CardDescription>For individuals joining your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Create tiers for individual members with different benefits, dues, and access levels.</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full justify-between">
              Select <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="border-2 hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => onSelect(MembershipFormType.AFFILIATION)}>
          <CardHeader>
            <Building2 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Affiliation Plan</CardTitle>
            <CardDescription>For organizations partnering with you</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Create tiers for partner organizations with different partnership levels and benefits.</p>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full justify-between">
              Select <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => onClose(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
} 