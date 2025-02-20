import React from 'react';
import {
  BuildingIcon,
  SquareUserRound,
  UsersIcon,
  FileTextIcon,
  FormInputIcon,
  CreditCardIcon,
  PackageIcon,
  FolderIcon,
  Settings2Icon,
} from "lucide-react";

/**
 * Permission System
 * ================
 * 
 * This file defines the permission system used throughout the application.
 * 
 * Basic Usage:
 * -----------
 * 1. Server Actions:
 *    ```typescript
 *    const handler = await withPermissions(
 *      handleAction,
 *      () => ({
 *        moduleId: entityId,
 *        moduleType: 'role',
 *        requiredPermissions: permissions.roles.edit
 *      })
 *    );
 *    ```
 * 
 * 2. Component Permissions:
 *    ```typescript
 *    <ComponentPermission
 *      requiredPermissions={[permissions.roles.assign]}
 *    >
 *      <Button>Assign Role</Button>
 *    </ComponentPermission>
 *    ```
 * 
 * 3. Page Access Control:
 *    ```typescript
 *    export default withOrgAccess(Page, {
 *      permissions: permissions.roles.view
 *    });
 *    ```
 * 
 * Advanced Usage:
 * --------------
 * 1. OR Conditions:
 *    ```typescript
 *    requiredPermissions: [
 *      [permissions.roles.admin],
 *      [permissions.roles.edit, permissions.members.edit]
 *    ]
 *    ```
 * 
 * 2. Object Format with Solo Permissions:
 *    ```typescript
 *    requiredPermissions: {
 *      solo: [permissions.group.admin],  // Override permissions
 *      any: [                           // OR conditions
 *        [permissions.roles.assign],
 *        [permissions.roles.edit, permissions.members.edit]
 *      ],
 *      all: [permissions.group.view]    // AND conditions
 *    }
 *    ```
 * 
 * 3. UI Components with Module Metadata:
 *    ```typescript
 *    const module = getModuleMetadata('roles');
 *    return (
 *      <div>
 *        {module.icon}
 *        <h2>{module.name}</h2>
 *        <p>{module.description}</p>
 *      </div>
 *    );
 *    ```
 * 
 * 4. Permission Lists:
 *    ```typescript
 *    const allPermissions = flattenedPermissions.map(p => ({
 *      ...p,
 *      module: getModuleMetadata(p.module)
 *    }));
 *    ```
 * 
 * Common Patterns:
 * --------------
 * 1. Checking Module Access:
 *    - Use single permission for basic access (view)
 *    - Use arrays for complex conditions
 *    - Use object format for override permissions
 * 
 * 2. Role Management:
 *    - Assign basic view permission for listing
 *    - Require edit permission for modifications
 *    - Use assign permission for user assignment
 * 
 * 3. UI Organization:
 *    - Group permissions by module
 *    - Use module metadata for consistent UI
 *    - Show relevant actions based on permissions
 */

// Define the permission structure
export const permissions = {
  group: {
    // view: "group.view",
    // create: "group.create",
    edit: "group.edit",
    // delete: "group.delete",
  },
  members: {
    view: "group.members.view",
    // create: "group.members.create",
    // edit: "group.members.edit",
    // delete: "group.members.delete",
    // invite: "group.members.invite",
    // approve: "group.members.approve",
  },
  roles: {
    view: "group.roles.view",
    create: "group.roles.create",
    edit: "group.roles.edit",
    delete: "group.roles.delete",
    assign: "group.roles.assign",
  },
  memberships: {
    view: "group.memberships.view",
    create: "group.memberships.create",
    edit: "group.memberships.edit",
    delete: "group.memberships.delete"
  },
  applications: {
    view: "group.applications.view",
    // create: "group.applications.create",
    // edit: "group.applications.edit",
    // delete: "group.applications.delete",
    process: "group.applications.process"
  },
  forms: {
    view: "group.forms.view",
    create: "group.forms.create",
    edit: "group.forms.edit",
    delete: "group.forms.delete",
    publish: "group.forms.publish"
  },
  payments: {
    view: "group.payments.view",
    // create: "group.payments.create",
    // edit: "group.payments.edit",
    // delete: "group.payments.delete",
    process: "group.payments.process",
    // refund: "group.payments.refund",
  },
  orders: {
    view: "group.orders.view",
    // create: "group.orders.create",
    // edit: "group.orders.edit",
    // delete: "group.orders.delete",
    // process: "group.orders.process",
    // cancel: "group.orders.cancel",
    // refund: "group.orders.refund",
  },
  files: {
    view: "group.files.view",
    download: "group.files.download",
    delete: "group.files.delete",
  },
} as const;

// Module metadata
export const permissionModules = {
  group: {
    name: "Group",
    description: "Manage group settings",
    icon: <BuildingIcon className="h-5 w-5" />,
    permissions: permissions.group,
  },
  members: {
    name: "Members",
    description: "Manage group members",
    icon: <UsersIcon className="h-5 w-5" />,
    permissions: permissions.members,
  },
  roles: {
    name: "Roles",
    description: "Manage group roles",
    icon: <SquareUserRound className="h-5 w-5" />,
    permissions: permissions.roles,
  },
  memberships: {
    name: "Memberships",
    description: "Manage group memberships",
    icon: <UsersIcon className="h-5 w-5" />,
    permissions: permissions.memberships,
  },
  applications: {
    name: "Applications",
    description: "Manage group applications",
    icon: <FileTextIcon className="h-5 w-5" />,
    permissions: permissions.applications,
  },
  forms: {
    name: "Forms",
    description: "Manage group forms",
    icon: <FormInputIcon className="h-5 w-5" />,
    permissions: permissions.forms,
  },
  payments: {
    name: "Payments",
    description: "Manage group payments",
    icon: <CreditCardIcon className="h-5 w-5" />,
    permissions: permissions.payments,
  },
  orders: {
    name: "Orders",
    description: "Manage group orders",
    icon: <PackageIcon className="h-5 w-5" />,
    permissions: permissions.orders,
  },
  files: {
    name: "Files",
    description: "Access and work with files",
    icon: <FolderIcon className="h-5 w-5" />,
    permissions: permissions.files,
  },
  fileManagement: {
    name: "File Management",
    description: "Manage file system settings and permissions",
    icon: <Settings2Icon className="h-5 w-5" />,
    permissions: permissions.fileManagement,
  },
} as const;

// Types
export type Permissions = typeof permissions;
export type PermissionGroup = keyof typeof permissions;
export type PermissionModules = typeof permissionModules;
export type PermissionModule = keyof typeof permissionModules;

export interface PermissionItem {
  label: string;
  value: string;
  module: PermissionModule;
  action: string;
}

// Utility functions
export function flattenPermissions(): PermissionItem[] {
  const items: PermissionItem[] = [];
  
  Object.entries(permissions).forEach(([module, modulePerms]) => {
    Object.entries(modulePerms).forEach(([action, value]) => {
      items.push({
        label: `${module}.${action}`,
        value,
        module: module as PermissionModule,
        action
      });
    });
  });
  
  return items;
}

// Cached flattened permissions
export const flattenedPermissions = flattenPermissions();

// Helper functions
export function getModuleForPermission(permission: string): PermissionModule | null {
  const item = flattenedPermissions.find(p => p.value === permission);
  return item ? item.module : null;
}

export function getModuleMetadata(module: PermissionModule) {
  return permissionModules[module];
}

// Legacy type for backward compatibility
export type OrgAccessOptions = {
  requireAuth?: boolean;
  permissions?: (keyof typeof permissions)[];
};
