"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Membership } from "@/types/database.types";
import MembershipTableRow from "./membership-table-row";

interface MembershipTableProps {
  memberships: Membership[];
}

export default function MembershipTable({ memberships }: MembershipTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="hidden sm:table-cell">Duration</TableHead>
            <TableHead className="hidden md:table-cell">Members</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((membership) => (
            <MembershipTableRow 
              key={membership.id} 
              membership={membership} 
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 