import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  permissionModules,
  type PermissionModule
} from "@/lib/types/permissions";

export default function PermissionsRow({
  permissions,
  field,
}: {
  permissions: { [key: string]: any };
  field: any;
}) {
  return Object.keys(permissions).map((key) => {
    const value = permissions[key] || [];
    if (typeof value === "string") {
      return (
        <ToggleGroupItem name={value} key={value} value={value} className="hover:bg-gray-200">
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </ToggleGroupItem>
      );
    } else if (typeof value === "object") {
      const module = permissionModules[key as PermissionModule];
      return (
        <TableRow key={key} className="hover:bg-gray-50">
          <TableCell className="font-semibold">
            <div className="flex items-center gap-2">
              {module?.icon}{" "}
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
            <span className="text-neutral-400 text-sm font-normal ml-7">
              {module?.description}
            </span>
          </TableCell>
          <TableCell className="flex gap-1 justify-end">
            <PermissionsRow permissions={value} field={field} />
          </TableCell>
        </TableRow>
      );
    }
  });
}
