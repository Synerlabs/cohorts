import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import UserTable from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_components/user-table";
import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoleById, getOrgRoleUsers } from "@/services/org.service";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Heading, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogBody } from "next/dist/client/components/react-dev-overlay/internal/components/Dialog";
import AddUserToRole from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/[roleId]/users/_components/add-user-to-role";

async function Page({ params }: OrgAccessHOCProps) {
  const role = await getOrgRoleById(params.roleId);
  const users = await getOrgRoleUsers({ id: params.roleId });
  return (
    <div className="w-full max-w-screen-lg flex flex-col justify-center items-center mx-auto">
      <div className="flex gap-4 w-full justify-center items-center align-middle mb-4 mt-8">
        <div className="flex align-end justify-end w-full">
          <AddUserToRole groupRoleId={params.roleId} />
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{role?.roleName}</CardTitle>
          <CardDescription>Manage users for this role</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <UserTable users={users} groupRoleId={params.roleId} />
          </Suspense>
        </CardContent>
        {/*<CardFooter>*/}
        {/*  <div className="text-xs text-muted-foreground">*/}
        {/*    Showing <strong>1-10</strong> of <strong>32</strong> products*/}
        {/*  </div>*/}
        {/*</CardFooter>*/}
      </Card>
    </div>
  );
}

export default withOrgAccess(Page);
