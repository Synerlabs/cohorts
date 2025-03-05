"use client";

import { Currency } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, Building2, CalendarClock, Clock, FileText, CheckCircle2, CreditCard, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm, { MembershipFormType } from "./membership-form";
import { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { permissions } from "@/lib/types/permissions";
import { ClientComponentPermission } from "@/components/ClientComponentPermission";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { deleteMembershipTierAction } from "../_actions/membership.action";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlansCardsProps {
  tiers: IMembershipTierProduct[];
  groupId: string;
  slug: string;
}

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$'
};

function formatPrice(price: number, currency: Currency): string {
  if (price === 0) return "Free";
  const amount = (price / 100).toFixed(2);
  return `${currencySymbols[currency]}${amount}`;
}

export default function SubscriptionPlansCards({ tiers, groupId, slug }: SubscriptionPlansCardsProps) {
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [deletingTier, setDeletingTier] = useState<IMembershipTierProduct | null>(null);
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [state, deleteTier, isPending] = useToastActionState(
    deleteMembershipTierAction
  );

  const handleDelete = async () => {
    if (!deletingTier) return;

    const formData = new FormData();
    formData.append('id', deletingTier.id);
    deleteTier(formData);
    setDeletingTier(null);
  };

  const hasEditPermission = hasPermission([permissions.memberships.edit]);
  const hasDeletePermission = hasPermission([permissions.memberships.delete]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const isAffiliation = tier.membership_tier?.type === 'organization';
          return (
            <Card 
              key={tier.id} 
              className="flex flex-col h-full relative group hover:shadow-md transition-all" 
            >
              <Link 
                href={`/@${slug}/membership/${tier.id}`} 
                className="absolute inset-0 z-10 cursor-pointer" 
                onClick={(e) => {
                  if ((e.target as Element).closest('.card-actions')) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
              >
                <span className="sr-only">View {tier.name} details</span>
              </Link>
              
              <CardHeader className="pb-1 pt-4 px-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">{tier.name}</h3>
                  <Badge variant={isAffiliation ? "outline" : "default"} className="z-20 relative text-xs">
                    {isAffiliation ? 'Affiliate' : 'Member'}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-1">
                  {tier.description || "No description provided"}
                </p>
              </CardHeader>
              
              <CardContent className="flex-grow py-2 px-4 space-y-3">
                <div>
                  <div className="text-2xl font-bold">
                    ${(tier.price / 100).toFixed(2)} <span className="text-muted-foreground text-sm font-normal">/tier</span>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Relationship Type:</span>
                    <span className="font-medium">{isAffiliation ? 'Affiliate' : 'Member'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Activation:</span>
                    <span className="font-medium">
                      {tier.membership_tier?.activation_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">{isAffiliation ? 'Affiliated Orgs:' : 'Members:'}</span>
                    <span className="font-medium">0</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="py-3 px-4 border-t z-20 relative grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full card-actions" onClick={() => setEditingTier(tier.id)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href={`/@${slug}/membership/${tier.id}`} className="flex items-center justify-center">
                    <Users className="h-3 w-3 mr-1" />
                    {isAffiliation ? 'Affiliates' : 'Members'}
                  </Link>
                </Button>
              </CardFooter>
              
              {/* Edit sheet */}
              <Sheet open={editingTier === tier.id} onOpenChange={(open) => {
                if (!open) setEditingTier(null);
              }}>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      {isAffiliation ? "Edit Affiliation Plan" : "Edit Membership Plan"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <MembershipForm
                      groupId={groupId}
                      tier={tier}
                      type={isAffiliation ? MembershipFormType.AFFILIATION : MembershipFormType.MEMBER}
                      onSuccess={() => setEditingTier(null)}
                    />
                  </div>
                </SheetContent>
              </Sheet>
              
              {/* Delete functionality moved to a separate dialog */}
              {hasDeletePermission && (
                <div className="absolute top-2 right-2 z-30 card-actions">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {isAffiliation ? "Affiliation" : "Membership"} Plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the {isAffiliation ? "affiliation" : "membership"} plan
                          and all associated memberships.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                          {isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog for deleting tiers */}
      {/* (Keep this code same as original) */}
    </>
  );
} 