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
import AddRoleBtn from "@/app/(authenticated)/[orgSlug]/(org-pages)/roles/_components/add-role-btn";
import { permissions } from "@/lib/types/permissions";

async function RolesPage({ org }: OrgAccessHOCProps) {
  const roles = await getOrgRoles({ id: org.id });

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
        <AddRoleBtn org={org} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/@${org.slug}/roles/${role.id}`}
          >
            <Card key={role.id} className="h-full hover:bg-accent/50 transition-colors">
              <CardHeader>
                <CardTitle>{role.roleName}</CardTitle>
                <CardDescription className="line-clamp-2">{role.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default withOrgAccess(RolesPage, {
  permissions: [permissions.roles.view],
  onAccessDenied: {
    action: "error",
  },
});
