import { getUsers } from "@/services/user.service";
import AddUserToRoleForm from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_components/add-user-to-role-form";
import { Suspense } from "react";

export default async function AddUserToRole({ groupRoleId }) {
  const users = await getUsers();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      {users && <AddUserToRoleForm users={users} groupRoleId={groupRoleId} />}
    </Suspense>
  );
}
