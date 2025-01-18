import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Membership } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, History } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import MembershipDialog from "./membership-dialog";
import { useState } from "react";

interface MembershipTableRowProps {
  membership: Membership;
}

export default function MembershipTableRow({ membership }: MembershipTableRowProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  // const currentVersion = membership.current_version;
  const currentVersion = true;
  
  if (!currentVersion) return null;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{membership.name}</div>
        <div className="text-sm text-muted-foreground">
          {membership.description}
        </div>
      </TableCell>
      <TableCell>
        {currentVersion.price === 0 ? (
          <Badge variant="secondary">Free</Badge>
        ) : (
          <div>
            <div>${currentVersion.price}</div>
            {membership.versions && membership.versions.length > 1 && (
              <div className="text-xs text-muted-foreground">
                Updated {formatDate(currentVersion.valid_from)}
              </div>
            )}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {currentVersion.duration_months} months
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