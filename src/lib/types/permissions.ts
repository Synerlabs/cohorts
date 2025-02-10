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
} as const;

export type OrgAccessOptions = {
  requireAuth?: boolean;
  permissions?: (keyof typeof permissions)[];
}; 