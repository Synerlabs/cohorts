import { getUsers } from "@/services/user.service";
import AddUserToRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_components/add-user-to-role-form";
import { Suspense } from "react";

interface AddUserToRoleProps {
  groupRoleId: string;
}

export default async function AddUserToRole({ groupRoleId }: AddUserToRoleProps) {
  const users = await getUsers();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddUserToRoleForm key={groupRoleId} users={users} groupRoleId={groupRoleId} />
    </Suspense>
  );
}
