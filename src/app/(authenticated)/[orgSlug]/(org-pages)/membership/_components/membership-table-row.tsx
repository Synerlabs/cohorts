import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, History, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import MembershipDialog from "./membership-dialog";
import DeleteMembershipDialog from "./delete-membership-dialog";
import { useState } from "react";
import { Membership, MembershipActivationType } from "@/lib/types/membership";

interface MembershipTableRowProps {
  membership: Membership;
}

const activationTypeLabels = {
  [MembershipActivationType.AUTOMATIC]: 'Automatic',
  [MembershipActivationType.REVIEW_REQUIRED]: 'Review Required',
  [MembershipActivationType.PAYMENT_REQUIRED]: 'Payment Required',
  [MembershipActivationType.REVIEW_THEN_PAYMENT]: 'Review then Payment',
} as const;

export default function MembershipTableRow({ membership }: MembershipTableRowProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{membership.name}</div>
        <div className="text-sm text-muted-foreground">
          {membership.description}
        </div>
      </TableCell>
      <TableCell>
        {membership.price === 0 ? (
          <Badge variant="secondary">Free</Badge>
        ) : (
          <div>
            <div>${membership.price}</div>
            {membership.created_at && (
              <div className="text-xs text-muted-foreground">
                Updated {formatDate(membership.created_at)}
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {membership.duration_months} months
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {membership.member_count || 0}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge
          variant={membership.is_active ? "outline" : "secondary"}
          className="capitalize"
        >
          {membership.is_active ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <Badge variant="secondary" className="capitalize">
          {activationTypeLabels[membership.activation_type]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={(e) => {
              e.preventDefault();
              setIsEditOpen(true);
            }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <History className="mr-2 h-4 w-4" />
              View History
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DeleteMembershipDialog
              membershipId={membership.id}
              groupId={membership.group_id}
              membershipName={membership.name}
            >
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DeleteMembershipDialog>
          </DropdownMenuContent>
        </DropdownMenu>

        <MembershipDialog 
          orgId={membership.group_id}
          membership={membership}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      </TableCell>
    </TableRow>
  );
} 