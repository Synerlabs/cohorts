import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function UserTableRow({ user }: { user: any }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">Olivia Smith</div>
        <div className="hidden text-sm text-muted-foreground md:inline">
          olivia@example.com
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">Refund</TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge className="text-xs" variant="outline">
          Declined
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">2023-06-24</TableCell>
      <TableCell className="text-right">$150.00</TableCell>
    </TableRow>
  );
}
