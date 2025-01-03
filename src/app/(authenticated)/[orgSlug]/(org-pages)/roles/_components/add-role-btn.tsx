import { ComponentPermission } from "@/components/ComponentPermission";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { permissions } from "@/lib/types/permissions";

export default function AddRoleBtn({ org }: { org: any }) {
  return (
    <ComponentPermission requiredPermissions={[permissions.roles.create]}>
      <Button className="ml-auto" size="sm" variant="outline" asChild>
        <Link href={`/@${org.slug}/roles/create`}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Role
        </Link>
      </Button>
    </ComponentPermission>
  );
}
