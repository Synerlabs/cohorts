"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow, { User, UserProfile } from "./user-table-row";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  groupRoleId?: string;
  membershipStatus?: string;
}

export default function UserTable({ 
  users, 
  isLoading = false, 
  groupRoleId,
  membershipStatus = "active"
}: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter members based on search query
  const filteredUsers = users.filter(user => {
    const fullName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.toLowerCase();
    const email = user.profile?.email?.toLowerCase() || '';
    const memberRecordId = user.id?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return fullName.includes(query) || email.includes(query) || memberRecordId.includes(query);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading members...</p>
        </div>
      </div>
    );
  }

  if (!users?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-64 text-center border rounded-lg bg-muted/10">
        <div className="flex flex-col items-center gap-2">
          <div className="p-2 rounded-full bg-muted">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="font-medium">No members found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {membershipStatus === "active" 
              ? "There are no active members in this organization." 
              : membershipStatus === "inactive" 
                ? "There are no inactive members in this organization."
                : "There are no members in this organization."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          {membershipStatus !== "active" && (
            <Badge variant={membershipStatus === "all" ? "outline" : (membershipStatus === "inactive" ? "destructive" : "default")}>
              {membershipStatus === "all" ? "All Members" : (membershipStatus === "inactive" ? "Inactive Members" : "Active Members")}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} {users.length === 1 ? "member" : "members"}
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            className="pl-10 w-full sm:w-[250px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40%]">Member</TableHead>
              <TableHead className="hidden lg:table-cell">Member ID</TableHead>
              <TableHead className="hidden sm:table-cell">Role</TableHead>
              <TableHead className="hidden md:table-cell">Joined</TableHead>
              {membershipStatus === "all" && (
                <TableHead className="hidden md:table-cell">Status</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  role={user.role || "Member"}
                  showStatus={membershipStatus === "all"}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={membershipStatus === "all" ? 5 : 4} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <p className="text-sm font-medium">No results found</p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
