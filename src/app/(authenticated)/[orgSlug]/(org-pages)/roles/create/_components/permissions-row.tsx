import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  permissionModuleDescriptions,
  permissionModuleIcons,
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
      console.log("STRING", value);
      return (
        <ToggleGroupItem name={value} key={value} value={value}>
          {key.charAt(0).toUpperCase() + key.slice(1)}
        </ToggleGroupItem>
      );
    } else if (typeof value === "object") {
      console.log("OBJECT", value);
      return (
        <TableRow key={key} className="hover:bg-gray-100">
          <TableCell className="font-semibold">
            <div className="flex items-center gap-2">
              {permissionModuleIcons[key]}{" "}
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </div>
          </TableCell>
          <TableCell className="text-neutral-400">
            {permissionModuleDescriptions[key]}
          </TableCell>
          <TableCell className="flex gap-1 justify-end">
            <PermissionsRow permissions={value} field={field} />
          </TableCell>
        </TableRow>
      );
    }
  });
}
