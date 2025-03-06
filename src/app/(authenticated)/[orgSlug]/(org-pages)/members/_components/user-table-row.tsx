import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle } from "lucide-react";

export interface User {
  id: string;
  memberId?: string | null;
  memberIdsRecordId?: string | null; // The ID of the record in member_ids table
  membershipId?: string | null; // For backwards compatibility
  externalId?: string | null; // For backwards compatibility
  memberIdEntry?: any; // For backwards compatibility
  createdAt: string;
  userId: string | null;
  profile: UserProfile | null;
  role?: string;
  isActive?: boolean;
}

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UserTableRowProps {
  user: User;
  role: string;
  showStatus?: boolean;
}

export default function UserTableRow({ user, role, showStatus = false }: UserTableRowProps) {
  const getInitial = (name?: string | null) => {
    return name ? name.charAt(0).toUpperCase() : '';
  };

  const fullName = user.profile?.first_name && user.profile?.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user.profile?.first_name || user.profile?.last_name || 'Unnamed User';
  
  // Determine the ID to display, prioritizing memberId
  let idToDisplay = '';
  let idLabel = '';
  
  if (user.memberId) {
    // Primary choice: memberId
    idToDisplay = user.memberId;
    idLabel = 'Member ID';
  } else if (user.externalId) {
    // Fallback for backwards compatibility
    idToDisplay = user.externalId;
    idLabel = 'External ID';
  } else if (user.membershipId) {
    // Another fallback
    idToDisplay = user.membershipId;
    idLabel = 'Membership ID';
  } else {
    // Final fallback to the group user ID
    idToDisplay = user.id;
    idLabel = 'Group User ID';
  }

  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={user.profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitial(user.profile?.first_name) || getInitial(user.profile?.last_name) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-foreground">
              {fullName}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="font-medium">{idLabel}:</span> 
              <span className="font-mono">{idToDisplay}</span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline" className="capitalize font-medium">
          {role}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
        {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
      </TableCell>
      {showStatus && (
        <TableCell className="hidden md:table-cell">
          <div className="flex items-center gap-1.5">
            {user.isActive === false ? (
              <>
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Inactive</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Active</span>
              </>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

