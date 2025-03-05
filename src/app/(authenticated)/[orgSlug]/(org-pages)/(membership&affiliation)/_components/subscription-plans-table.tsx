"use client";

import { Currency } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Users, Building2 } from "lucide-react";
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
import { MembershipService } from "@/services/membership.service";
import { useToast } from "@/components/ui/use-toast";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";
import { permissions } from "@/lib/types/permissions";
import { ClientComponentPermission } from "@/components/ClientComponentPermission";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { deleteMembershipTierAction } from "../_actions/membership.action";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlansTableProps {
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

export default function SubscriptionPlansTable({ tiers, groupId, slug }: SubscriptionPlansTableProps) {
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

  const showActions = hasPermission([permissions.memberships.edit]) || hasPermission([permissions.memberships.delete]);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Activation</TableHead>
            <TableHead>Form</TableHead>
            <TableHead>Members</TableHead>
            {showActions && (
              <TableHead className="w-[100px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => {
            console.log('Processing tier:', tier);
            const isAffiliation = tier.membership_tier?.type === 'organization';
            return (
              <TableRow key={tier.id}>
                <TableCell>
                  <Badge variant={isAffiliation ? "outline" : "default"} className="flex items-center gap-1">
                    {isAffiliation ? (
                      <>
                        <Building2 className="h-3 w-3" />
                        Affiliation
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        Membership
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{tier.name}</TableCell>
                <TableCell>{tier.description}</TableCell>
                <TableCell>
                  {formatPrice(tier.price, tier.currency)}
                </TableCell>
                <TableCell>
                  {tier.membership_tier?.duration_months ?? 1} month{(tier.membership_tier?.duration_months ?? 1) !== 1 ? 's' : ''}
                </TableCell>
                <TableCell>
                  {tier.membership_tier?.activation_type}
                </TableCell>
                <TableCell>
                  {tier.membership_tier?.form_template_id ? "Yes" : "No"}
                </TableCell>
                <TableCell>
                  <Link href={`/${slug}/memberships/tiers/${tier.id}`}>
                    View
                  </Link>
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ClientComponentPermission requiredPermissions={[permissions.memberships.edit]}>
                        <Sheet open={editingTier === tier.id} onOpenChange={(open) => {
                          if (!open) setEditingTier(null);
                        }}>
                          <SheetTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTier(tier.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent>
                            <SheetHeader>
                              <SheetTitle>
                                {isAffiliation ? "Edit Affiliation Plan" : "Edit Membership Plan"}
                              </SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 pb-6">
                              <MembershipForm
                                groupId={groupId}
                                tier={tier}
                                type={isAffiliation ? MembershipFormType.AFFILIATION : MembershipFormType.MEMBER}
                                onSuccess={() => setEditingTier(null)}
                              />
                            </div>
                          </SheetContent>
                        </Sheet>
                      </ClientComponentPermission>

                      <ClientComponentPermission requiredPermissions={[permissions.memberships.delete]}>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingTier(tier)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                      </ClientComponentPermission>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
} 