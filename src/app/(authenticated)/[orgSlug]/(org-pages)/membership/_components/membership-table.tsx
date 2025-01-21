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
} from "@/components/ui/alert-dialog";
import { deleteMembershipTierAction } from "../_actions/membership.action";
import { useToast } from "@/components/ui/use-toast";
import useToastActionState from "@/lib/hooks/toast-action-state.hook";

interface MembershipTableProps {
  tiers: IMembershipTierProduct[];
  groupId: string;
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

export default function MembershipTable({ tiers, groupId }: MembershipTableProps) {
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [deletingTier, setDeletingTier] = useState<IMembershipTierProduct | null>(null);
  const { toast } = useToast();
  
  const [deleteState, deleteTier, isPending] = useToastActionState(
    deleteMembershipTierAction,
    undefined,
    undefined,
    {
      successTitle: "Success",
      successDescription: "Membership tier deleted successfully"
    }
  );

  const handleDelete = async () => {
    if (!deletingTier) return;
    
    const formData = new FormData();
    formData.append('id', deletingTier.id);
    await deleteTier(formData);
    setDeletingTier(null);
  };

  console.log('Tiers received in table:', tiers);

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
            <TableHead>Members</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
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
                <TableCell>0</TableCell>
                <TableCell>
                  <div className="flex gap-2">
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeletingTier(tier)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!deletingTier} onOpenChange={(open) => !isPending && setDeletingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Membership Tier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the membership tier "{deletingTier?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 