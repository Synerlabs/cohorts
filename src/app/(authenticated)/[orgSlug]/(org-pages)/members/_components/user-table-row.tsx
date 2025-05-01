'use client';

import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MailQuestion } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  email?: string | null;
}

export interface User {
  id: string;
  createdAt: string;
  userId: string;
  isActive: boolean; // We expect this from getOrgMembers
  profile: UserProfile | null;
  memberId?: string | null;
  memberIdsRecordId?: string | null;
  role?: string; // Role might be added later
}

interface UserTableRowProps {
  user: User;
  role: string;
  showStatus?: boolean;
}

// Helper to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

export default function UserTableRow({ user, role, showStatus = false }: UserTableRowProps) {
  const joinedDate = user.createdAt ? new Date(user.createdAt) : null;

  return (
    <TooltipProvider delayDuration={100}>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.profile?.avatarUrl || undefined} />
              <AvatarFallback>{getInitials(user.profile?.firstName, user.profile?.lastName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium flex items-center">
                {user.profile?.firstName || user.profile?.lastName 
                  ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
                  : "Unnamed User"
                }
                {!user.isActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MailQuestion className="ml-2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pending Invite</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              {user.profile?.email && (
                <span className="text-xs text-muted-foreground">
                  {user.profile.email}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">
          {user.memberId || '-'}
        </TableCell>
        <TableCell className="hidden sm:table-cell">{role}</TableCell>
        <TableCell className="hidden md:table-cell">
          {joinedDate ? formatDistanceToNow(joinedDate, { addSuffix: true }) : "-"}
        </TableCell>
        {showStatus && (
          <TableCell className="hidden md:table-cell">
            <Badge variant={user.isActive ? "default" : "outline"}>
              {user.isActive ? "Active" : "Pending"}
            </Badge>
          </TableCell>
        )}
      </TableRow>
    </TooltipProvider>
  );
}

