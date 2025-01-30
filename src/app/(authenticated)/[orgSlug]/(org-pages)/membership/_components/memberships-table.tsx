import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { IMembership } from "../_actions/membership.action";

interface MembershipsTableProps {
  memberships: IMembership[];
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export default function MembershipsTable({ memberships }: MembershipsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {memberships.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No memberships found
            </TableCell>
          </TableRow>
        ) : (
          memberships.map((membership) => (
            <TableRow key={`${membership.group_user_id}-${membership.order_id}`}>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {`${membership.group_user.user.first_name} ${membership.group_user.user.last_name}`}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {membership.start_date ? (
                  formatDate(membership.start_date)
                ) : (
                  <span className="text-muted-foreground">Not started</span>
                )}
              </TableCell>
              <TableCell>
                {membership.end_date ? (
                  formatDate(membership.end_date)
                ) : (
                  <span className="text-muted-foreground">No end date</span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    membership.status === "active"
                      ? "default"
                      : membership.status === "expired"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {membership.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    {formatCurrency(membership.order.amount, membership.order.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {membership.order.status}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
} 
