"use client";

import { MembershipTier } from "@/lib/types/membership";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import MembershipForm from "./membership-form";
import { useState } from "react";

interface MembershipTableProps {
  tiers: MembershipTier[];
  groupId: string;
}

export default function MembershipTable({ tiers, groupId }: MembershipTableProps) {
  const [editingTier, setEditingTier] = useState<string | null>(null);

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
        {tiers.map((tier) => (
          <TableRow key={tier.id}>
            <TableCell>{tier.name}</TableCell>
            <TableCell>{tier.description}</TableCell>
            <TableCell>
              {tier.price === 0 ? "Free" : `$${tier.price.toFixed(2)}`}
            </TableCell>
            <TableCell>
              {tier.duration_months} month{tier.duration_months !== 1 ? 's' : ''}
            </TableCell>
            <TableCell className="capitalize">
              {tier.activation_type.toLowerCase()}
            </TableCell>
            <TableCell>{tier.member_count || 0}</TableCell>
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
        ))}
      </TableBody>
    </Table>
  );
} 