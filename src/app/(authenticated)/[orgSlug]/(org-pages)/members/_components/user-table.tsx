"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow, { User, UserProfile } from "./user-table-row";

export default function UserTable({ users }: { users: User[] }) {
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
          {users?.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
        
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
