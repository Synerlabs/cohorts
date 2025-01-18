"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow, { User, UserProfile } from "./user-table-row";

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
}

export default function UserTable({ users, isLoading = false }: UserTableProps) {
  if (isLoading) {
    return <div>Loading users...</div>; // Consider using a proper loading skeleton
  }

  if (!users?.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        No users found
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden md:table-cell">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              role={user.role}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
