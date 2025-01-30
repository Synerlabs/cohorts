import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function MembershipsTable({ memberships }: MembershipsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Membership Type</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Payment</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {memberships.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No memberships found
            </TableCell>
          </TableRow>
        ) : (
          memberships.map((membership) => {
            const membershipTier = membership.order.suborders[0]?.product;
            return (
              <TableRow key={`${membership.group_user_id}-${membership.order_id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={membership.group_user.user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(
                          membership.group_user.user.first_name,
                          membership.group_user.user.last_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">
                      {`${membership.group_user.user.first_name} ${membership.group_user.user.last_name}`}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {membershipTier ? (
                    <div>
                      <div className="font-medium">{membershipTier.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {membershipTier.membership_tiers[0]?.duration_months} months
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
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
            );
          })
        )}
      </TableBody>
    </Table>
  );
} 
