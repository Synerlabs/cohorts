// const permissions as enum
import {
  BuildingIcon,
  FolderKeyIcon,
  SquareUserRound,
  UsersIcon,
} from "lucide-react";

export const permissions = {
  group: {
    view: "group.view",
    create: "group.add",
    edit: "group.edit",
    delete: "group.delete",
  },
  members: {
    view: "group.members.view",
    add: "group.members.add",
    edit: "group.members.edit",
    delete: "group.members.delete",
  },
  memberships: {
    view: "group.memberships.view",
    create: "group.memberships.create",
    edit: "group.memberships.edit",
    delete: "group.memberships.delete",
  },
  roles: {
    view: "group.roles.view",
    create: "group.roles.create",
    edit: "group.roles.edit",
    delete: "group.roles.delete",
  },
  permissions: {
    view: "group.roles.permissions.view",
    edit: "group.roles.permissions.edit",
    delete: "group.roles.permissions.delete",
  },
};

export const permissionModuleDescriptions = {
  group: "Manage group settings",
  members: "Manage group members",
  roles: "Manage group roles",
  permissions: "Manage group role permissions",
};

export const permissionModuleIcons = {
  group: <BuildingIcon className="h-5 w-5" />,
  members: <UsersIcon className="h-5 w-5" />,
  roles: <SquareUserRound className="h-5 w-5" />,
  permissions: <FolderKeyIcon className="h-5 w-5" />,
};

// type for permissionModuleIcons
export type PermissionModuleIcons = typeof permissionModuleIcons;
export type PermissionGroup = keyof typeof permissions;

export type Permissions = typeof permissions;

const flattenPermissions = (permissions, prefix = "") => {
  return Object.keys(permissions).reduce((acc, key) => {
    const value = permissions[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      acc.push({ label: newKey, value });
    } else if (typeof value === "object") {
      acc = acc.concat(flattenPermissions(value, newKey));
    }
    return acc;
  }, []);
};

export const flattenedPermissions = flattenPermissions(permissions);
