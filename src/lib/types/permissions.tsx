import React from 'react';
import {
  BuildingIcon,
  FolderKeyIcon,
  SquareUserRound,
  UsersIcon,
  FileTextIcon,
  FormInputIcon,
  CreditCardIcon,
} from "lucide-react";

export const permissions = {
  group: {
    view: "group.view",
    create: "group.create",
    edit: "group.edit",
    delete: "group.delete",
  },
  members: {
    view: "group.members.view",
    create: "group.members.create",
    edit: "group.members.edit",
    delete: "group.members.delete",
    invite: "group.members.invite",
    approve: "group.members.approve",
  },
  roles: {
    view: "group.roles.view",
    create: "group.roles.create",
    edit: "group.roles.edit",
    delete: "group.roles.delete",
    assign: "group.roles.assign",
  },
  permissions: {
    view: "group.permissions.view",
    assign: "group.permissions.assign",
    edit: "group.permissions.edit",
  },
  memberships: {
    view: "group.memberships.view",
    create: "group.memberships.create",
    edit: "group.memberships.edit",
    delete: "group.memberships.delete",
    manage: "group.memberships.manage",
  },
  applications: {
    view: "group.applications.view",
    create: "group.applications.create",
    edit: "group.applications.edit",
    delete: "group.applications.delete",
    approve: "group.applications.approve",
    reject: "group.applications.reject",
  },
  forms: {
    view: "group.forms.view",
    create: "group.forms.create",
    edit: "group.forms.edit",
    delete: "group.forms.delete",
    submit: "group.forms.submit",
    manage: "group.forms.manage",
  },
  payments: {
    view: "group.payments.view",
    create: "group.payments.create",
    edit: "group.payments.edit",
    delete: "group.payments.delete",
    process: "group.payments.process",
    refund: "group.payments.refund",
  },
};

export const permissionModuleDescriptions = {
  group: "Manage group settings",
  members: "Manage group members",
  roles: "Manage group roles",
  permissions: "Manage group role permissions",
  memberships: "Manage group memberships",
  applications: "Manage group applications",
  forms: "Manage group forms",
  payments: "Manage group payments",
};

export const permissionModuleIcons = {
  group: <BuildingIcon className="h-5 w-5" />,
  members: <UsersIcon className="h-5 w-5" />,
  roles: <SquareUserRound className="h-5 w-5" />,
  permissions: <FolderKeyIcon className="h-5 w-5" />,
  memberships: <UsersIcon className="h-5 w-5" />,
  applications: <FileTextIcon className="h-5 w-5" />,
  forms: <FormInputIcon className="h-5 w-5" />,
  payments: <CreditCardIcon className="h-5 w-5" />,
};

// type for permissionModuleIcons
export type PermissionModuleIcons = typeof permissionModuleIcons;
export type PermissionGroup = keyof typeof permissions;

export type Permissions = typeof permissions;

// Fix the flattenPermissions function type
interface PermissionItem {
  label: string;
  value: string;
}

const flattenPermissions = (
  permissions: Record<string, any>, 
  prefix = ""
): PermissionItem[] => {
  return Object.keys(permissions).reduce<PermissionItem[]>((acc, key) => {
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
