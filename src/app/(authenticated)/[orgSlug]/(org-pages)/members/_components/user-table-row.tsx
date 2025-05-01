'use client';

import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MailQuestion, Archive, Pencil } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MemberActionsCell } from './member-actions-cell';
import { EditMemberIdModal } from './edit-member-id-modal';
import { ClientComponentPermission } from "@/components/ClientComponentPermission";
import { permissions } from "@/lib/types/permissions";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

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
  orgSlug: string;
  onRowClick: (user: User) => void;
}

// Helper to get initials
const getInitials = (firstName?: string | null, lastName?: string | null) => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '?';
};

export default function UserTableRow({ user, role, showStatus = false, orgId, orgSlug, onRowClick }: UserTableRowProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const joinedDate = user.createdAt ? new Date(user.createdAt) : null;

  // Check if this row's member ID is being edited
  const editMemberId = searchParams.get('editMemberId');
  const isEditing = editMemberId === user.id;

  const handleEditClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent row click
    
    // Create new URLSearchParams with current params plus our edit param
    const params = new URLSearchParams(searchParams);
    params.set('editMemberId', user.id);
    
    // Update URL to include the edit param
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleModalClose = () => {
    // Remove the editMemberId param from URL
    const params = new URLSearchParams(searchParams);
    params.delete('editMemberId');
    
    // Update URL without the edit param
    router.push(`${pathname}?${params.toString()}`);
  };

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
    <>
    <TooltipProvider delayDuration={100}>
      <TableRow 
        className={`cursor-pointer hover:bg-muted/50 ${user.isDeleted ? 'opacity-60' : ''}`}
        onClick={() => onRowClick(user)}
        title="View member details"
      >
        <TableCell className="group">
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
        <TableCell 
          className="hidden lg:table-cell text-xs font-mono text-muted-foreground group relative"
          onClick={(e) => e.stopPropagation()}
        >
          <ClientComponentPermission requiredPermissions={[permissions.memberships.edit]}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleEditClick} 
                  className="absolute inset-0 flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Edit Member ID"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Edit Member ID</p>
              </TooltipContent>
            </Tooltip>
           </ClientComponentPermission>
           <span className="pl-1 pr-6">
             {user.memberId || '-'}
           </span>
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
        <TableCell onClick={(e) => e.stopPropagation()}>
          <MemberActionsCell 
            orgId={orgId}
            orgSlug={orgSlug}
            groupUsersId={user.id}
            userEmail={user.profile?.email || null}
            userName={getUserName()}
            isActive={user.isActive}
            isDeleted={user.isDeleted}
          />
        </TableCell>
      </TableRow>
    </TooltipProvider>

    {/* Only render modal when this row is being edited */}
    {isEditing && (
      <EditMemberIdModal
        isOpen={true}
        setIsOpen={(open) => {
          if (!open) handleModalClose();
        }}
        orgId={orgId}
        groupUserId={user.id}
        currentMemberId={user.memberId}
      />
    )}
    </>
  );
}

