import Link from "next/link";
import {
  Home,
  LineChart,
  Package,
  Settings,
  ShoppingCart,
  SquareUserRound,
  Users,
  InboxIcon,
  CreditCard,
  FormInput,
  Network,
  Building2,
} from "lucide-react";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { permissions } from "@/lib/types/permissions";
import snakecaseKeys from "snakecase-keys";
import camelcaseKeys from "camelcase-keys";

type SidebarProps = {
  org: Camelized<Tables<"group">>;
  user: any;
}; 

type UserRole = Camelized<Tables<"user_roles">> & {
  groupRoles: Camelized<Tables<"group_roles">> | null;
};

export async function OrgSidebar({ org, user }: SidebarProps) {
  const { userPermissions = [], groupRoles = [] } = getAuthenticatedServerContext();

  // Check if user is a super admin
  const isSuperAdmin = groupRoles.map(role => camelcaseKeys(role)).some((role: UserRole) => 
    {
      return role.isActive && role.groupRoles?.isSuperAdmin
    }
  );

  // Define all possible links
  const allLinks = [
    {
      name: "Dashboard",
      href: `/@${org.slug}`,
      icon: <Home className="h-4 w-4" />,
      permission: null, // No permission required
    },
    {
      name: "Members",
      href: `/@${org.slug}/members`,
      icon: <Users className="h-4 w-4" />,
      permission: permissions.members.view,
    },
    {
      name: "Orders",
      href: `/@${org.slug}/orders`,
      icon: <ShoppingCart className="h-4 w-4" />,
      permission: permissions.memberships.view,
    },
    {
      name: "Organization Affiliations",
      href: `/@${org.slug}/affiliations`,
      icon: <Building2 className="h-4 w-4" />,
      permission: null, // No permission required for now, will be handled at the page level
    },
    {
      name: "Memberships",
      href: `/@${org.slug}/membership`,
      icon: <Package className="h-4 w-4" />,
      permission: permissions.memberships.view,
    },
    {
      name: "Applications",
      href: `/@${org.slug}/applications`,
      icon: <InboxIcon className="h-4 w-4" />,
      permission: permissions.applications?.view,
    },
    {
      name: "Payments",
      href: `/@${org.slug}/payments`,
      icon: <CreditCard className="h-4 w-4" />,
      permission: permissions.payments?.view,
    },
    {
      name: "Forms",
      href: `/@${org.slug}/forms`,
      icon: <FormInput className="h-4 w-4" />,
      permission: permissions.forms?.view,
    },
    {
      name: "Roles & Permissions",
      href: `/@${org.slug}/roles`,
      icon: <SquareUserRound className="h-4 w-4" />,
      permission: permissions.roles.view,
    },
    {
      name: "Site Settings",
      href: `/@${org.slug}/settings`,
      icon: <Settings className="h-4 w-4" />,
      permission: permissions.group.edit,
    },
  ];

  console.log("SUPERADMIN", isSuperAdmin);

  // Filter links based on permissions
  const visibleLinks = allLinks.filter(link => 
    // Show if no permission required, or user is super admin, or user has the required permission
    !link.permission || isSuperAdmin || userPermissions.includes(link.permission)
  );

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[200px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex-1">
            <div className="pt-6 pl-6 pb-4">
              <h4>{org.alternateName || org.name || "cohorts."}</h4>
            </div>
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {visibleLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
