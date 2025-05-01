'use client';

import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MailQuestion, Archive } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MemberActionsCell } from './member-actions-cell';

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
  isDeleted: boolean; // Added isDeleted
  profile: UserProfile | null;
  memberId?: string | null;
  memberIdsRecordId?: string | null;
  role?: string; // Role might be added later
}

interface UserTableRowProps {
  user: User;
  role: string;
  showStatus?: boolean;
  orgId: string;
}

// Helper to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

export default function UserTableRow({ user, role, showStatus = false, orgId }: UserTableRowProps) {
  const joinedDate = user.createdAt ? new Date(user.createdAt) : null;

  // Helper to construct display name for the action cell
  const getUserName = () => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return null;
  };

  // Determine status text and variant for the optional status badge
  let statusText = "Unknown";
  let statusVariant: "default" | "outline" | "destructive" = "outline";
  if (user.isDeleted) {
    statusText = "Deleted";
    statusVariant = "destructive";
  } else if (user.isActive) {
    statusText = "Active";
    statusVariant = "default";
  } else {
    statusText = "Pending"; // isActive = false, isDeleted = false
    statusVariant = "outline";
  }

  return (
    <TooltipProvider delayDuration={100}>
      <TableRow className={user.isDeleted ? 'opacity-60' : ''}>
        <TableCell>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.profile?.avatarUrl || undefined} className={user.isDeleted ? 'opacity-50' : ''} />
              <AvatarFallback>{getInitials(user.profile?.firstName, user.profile?.lastName)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium flex items-center">
                <span className={user.isDeleted ? 'line-through' : ''}>
                  {user.profile?.firstName || user.profile?.lastName 
                    ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim()
                    : "Unnamed User"
                  }
                </span>
                {!user.isActive && !user.isDeleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <MailQuestion className="ml-2 h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pending Invite</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {user.isDeleted && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Archive className="ml-2 h-4 w-4 text-destructive" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Deleted</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              {user.profile?.email && (
                <span className={`text-xs text-muted-foreground ${user.isDeleted ? 'line-through' : ''}`}>
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
          {user.isDeleted ? '-' : (joinedDate ? formatDistanceToNow(joinedDate, { addSuffix: true }) : "-")}
        </TableCell>
        {showStatus && (
          <TableCell className="hidden md:table-cell">
            <Badge variant={statusVariant}>
              {statusText}
            </Badge>
          </TableCell>
        )}
        <TableCell>
          <MemberActionsCell 
            orgId={orgId}
            groupUsersId={user.id}
            userEmail={user.profile?.email || null}
            userName={getUserName()}
            isActive={user.isActive}
            isDeleted={user.isDeleted}
          />
        </TableCell>
      </TableRow>
    </TooltipProvider>
  );
}

