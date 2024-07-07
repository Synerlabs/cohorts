import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoles } from "@/services/org.service";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

async function RolesPage({ org }: OrgAccessHOCProps) {
  const roles = await getOrgRoles({ id: org.id });

  return (
    <>
      <div className="flex flex-col gap-4 w-full justify-center items-center align-middle">
        <div className="flex md:max-w-screen-md w-full mt-4">
          <h2>Roles & Permissions</h2>
          <Button className="ml-auto" size="sm" variant="outline" asChild>
            <Link href={`/@${org.slug}/roles/create`}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Role
            </Link>
          </Button>
        </div>
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/@${org.slug}/roles/${role.id}`}
            className="md:max-w-screen-md w-full"
          >
            <Card key={role.id}>
              <CardHeader>
                <CardTitle>{role.roleName}</CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

export default withOrgAccess(RolesPage);
