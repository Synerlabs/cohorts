"use client";

import { Currency } from "@/lib/types/membership";
import { IMembershipTierProduct } from "@/lib/types/product";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm from "./membership-form";
import { useState } from "react";

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

  console.log('Tiers received in table:', tiers);

  return (
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
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
} 