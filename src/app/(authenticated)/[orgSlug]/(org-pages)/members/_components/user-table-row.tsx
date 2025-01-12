import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface User {
  id: string;
    createdAt: string;
    userId: string | null;
    profile: UserProfile | null;
}

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface UserTableRowProps {
  user: User;
  role: string;
}

export default function UserTableRow({ user, role }: UserTableRowProps) {
  const getInitial = (name?: string | null) => {
    return name ? name.charAt(0).toUpperCase() : '';
  };

  const fullName = user.profile.first_name && user.profile.last_name
    ? `${user.profile.first_name} ${user.profile.last_name}`
    : user.profile.first_name || user.profile.last_name || 'Unnamed User';

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.profile.avatar_url ?? undefined} />
            <AvatarFallback>
              {getInitial(user.profile.first_name) || getInitial(user.profile.last_name) || '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {fullName}
            </div>
            <div className="text-sm text-muted-foreground">
              {user.userId}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline" className="capitalize">
          {role}
        </Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {user.createdAt ? formatDate(user.createdAt) : 'Unknown'}
      </TableCell>
    </TableRow>
  );
}
