"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow from "./user-table-row";

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    createdAt: string;
    userId: string;
    profile: {
      first_name: string | null;
      last_name: string | null;
      avatar_url: string | null;
    };
  };
}

export default function UserTable({ members }: { members: Member[] }) {
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
          {members?.map((member) => (
            <UserTableRow
              key={member.id}
              user={member.user}
              role={member.role}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
