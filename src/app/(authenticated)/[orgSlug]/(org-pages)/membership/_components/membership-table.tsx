"use client";

import { Currency } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm from "./membership-form";
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

interface MembershipTableProps {
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

export default function MembershipTable({ tiers, groupId, slug }: MembershipTableProps) {
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
            return (
              <TableRow key={tier.id}>
                <TableCell>{tier.name}</TableCell>
                <TableCell>{tier.description}</TableCell>
                <TableCell>
                  {formatPrice(tier.price, tier.currency)}
                </TableCell>
                <TableCell>
                  {tier.membership_tier?.duration_months ?? 1} month{(tier.membership_tier?.duration_months ?? 1) !== 1 ? 's' : ''}
                </TableCell>
                <TableCell className="capitalize">
                  {tier.membership_tier?.activation_type ?? 'automatic'}
                </TableCell>
                <TableCell>
                  {tier.membership_tier?.form_template_id ? (
                    <a 
                      href={`/@${slug}/forms/${tier.membership_tier.form_template_id}/edit`}
                      className="text-primary hover:underline"
                    >
                      View Form
                    </a>
                  ) : (
                    <span className="text-muted-foreground">No form</span>
                  )}
                </TableCell>
                <TableCell>0</TableCell>
                {showActions && (
                  <TableCell className="flex gap-2">
                    <ClientComponentPermission requiredPermissions={[permissions.memberships.edit]}>
                      <Sheet open={editingTier === tier.id} onOpenChange={(open) => setEditingTier(open ? tier.id : null)}>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>Edit Membership Tier</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4 pb-6">
                            <MembershipForm 
                              groupId={groupId} 
                              tier={tier} 
                              onSuccess={() => setEditingTier(null)}
                            />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </ClientComponentPermission>

                    <ClientComponentPermission requiredPermissions={[permissions.memberships.delete]}>
                      <AlertDialog open={deletingTier?.id === tier.id} onOpenChange={(open) => setDeletingTier(open ? tier : null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the membership tier and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </ClientComponentPermission>
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