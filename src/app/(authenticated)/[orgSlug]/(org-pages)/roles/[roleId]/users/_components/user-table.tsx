import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserTableRow from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_components/user-table-row";

export default function UserTable({
  users,
  groupRoleId,
}: {
  users: any;
  groupRoleId: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden w-[100px] sm:table-cell">
            <span className="sr-only">Image</span>
          </TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="hidden md:table-cell">Added</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <UserTableRow key={user.id} userRole={user} />
        ))}
      </TableBody>
    </Table>
  );
}
