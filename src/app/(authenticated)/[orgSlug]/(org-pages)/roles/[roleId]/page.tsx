import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getOrgRoleById, getOrgRolePermissions } from "@/services/org.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

async function RolePage({ org, params }: OrgAccessHOCProps) {
  const role = await getOrgRoleById(params.roleId);
  const permissions = await getOrgRolePermissions(params.roleId);
  return (
    <div className="flex flex-col gap-4 w-full justify-center items-center align-middle">
      <div className="flex md:max-w-screen-md w-full mt-4">
        <h2>Role Management</h2>
      </div>
      <Card className="md:max-w-screen-md w-full">
        <CardHeader>
          <CardTitle>{role.roleName}</CardTitle>
          <CardDescription>{role.description}</CardDescription>
        </CardHeader>
      </Card>
      <Card className="md:max-w-screen-md w-full">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>Manage permissions for this role</CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.map((permission) => (
            <div key={permission.permission}>
              <Checkbox
                checked={permission.permission === "group.edit"}
                // onCheckedChange={() => {
                //   console.log("checked");
                // }}
              ></Checkbox>
              {permission.permission}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default withOrgAccess(RolePage);
