export const permissions = {
  group: {
    view: "group.view",
    create: "group.create",
    edit: "group.edit",
    delete: "group.delete",
  },
  members: {
    view: "members.view",
    add: "members.add",
    edit: "members.edit",
    delete: "members.delete",
  },
  roles: {
    view: "roles.view",
    create: "roles.create",
    edit: "roles.edit",
    delete: "roles.delete",
  },
  permissions: {
    view: "permissions.view",
    assign: "permissions.assign",
  },
  memberships: {
    view: "memberships.view",
    manage: "memberships.manage",
  },
  applications: {
    view: "applications.view",
    create: "applications.create",
    edit: "applications.edit",
    delete: "applications.delete",
    approve: "applications.approve",
    reject: "applications.reject",
  },
} as const;

export type OrgAccessOptions = {
  requireAuth?: boolean;
  permissions?: (keyof typeof permissions)[];
}; 