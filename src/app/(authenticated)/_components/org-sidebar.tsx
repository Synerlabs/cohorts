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
} from "lucide-react";
import { Tables } from "@/lib/types/database.types";
import { Camelized } from "humps";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";
import { permissions } from "@/lib/types/permissions";

type SidebarProps = {
  org: Camelized<Tables<"group">>;
  user: any;
};

export async function OrgSidebar({ org, user }: SidebarProps) {
  const { userPermissions } = getAuthenticatedServerContext();
  const links = [
    {
      name: "Dashboard",
      href: `/@${org.slug}`,
      icon: <Home className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.members.view) && {
      name: "Members",
      href: `/@${org.slug}/members`,
      icon: <Users className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.memberships.view) && {
      name: "Memberships",
      href: `/@${org.slug}/membership`,
      icon: <Package className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.members.edit) && {
      name: "Applications",
      href: `/@${org.slug}/applications`,
      icon: <InboxIcon className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.members.edit) && {
      name: "Payments",
      href: `/@${org.slug}/payments`,
      icon: <CreditCard className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.roles.view) && {
      name: "Roles & Permissions",
      href: `/@${org.slug}/roles`,
      icon: <SquareUserRound className="h-4 w-4" />,
    },
    userPermissions?.includes(permissions.group.edit) && {
      name: "Site Settings",
      href: `/@${org.slug}/settings`,
      icon: <Settings className="h-4 w-4" />,
    },
  ];
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[200px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex-1">
            <div className="pt-6 pl-6 pb-4">
              <h4>{org.alternateName || org.name || "cohorts."}</h4>
            </div>
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {links.map(
                (link) =>
                  link && (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                    >
                      {link.icon}
                      {link.name}
                    </Link>
                  ),
              )}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
