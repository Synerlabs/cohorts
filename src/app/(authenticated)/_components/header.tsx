"use client";

import Image from "next/image";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Home,
  LineChart,
  Package,
  Package2,
  PanelLeft,
  ShoppingCart,
  Users2,
} from "lucide-react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@supabase/auth-js";
import AvatarDropdown from "@/app/(authenticated)/_components/avatar-dropdown";
import { usePathname } from "next/navigation";
import * as React from "react";

type HeaderProps = {
  user: User | null;
  /**
   * Optional base URL for logout redirection
   * If provided, user will be redirected to this URL after logout
   * @example "/@org-slug"
   */
  baseUrl?: string;
};

function generateBreadcrumbs(pathname: string) {
  // Remove leading slash and split path into segments
  const segments = pathname.split('/').filter(Boolean);
  
  // Handle org slug (starts with @)
  if (segments[0]?.startsWith('@')) {
    const orgSlug = segments[0];
    const paths = segments.slice(1);
    
    // Generate breadcrumb items
    return {
      orgSlug,
      items: paths.map((segment, index) => {
        // Create the href for this breadcrumb, including the org slug
        const href = `/${orgSlug}/${paths.slice(0, index + 1).join('/')}`;
        
        // Capitalize and clean up the segment name
        const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
        
        return {
          href,
          name,
          isLast: index === paths.length - 1
        };
      })
    };
  }
  
  return { orgSlug: null, items: [] };
}

export default function Header({ user, baseUrl }: HeaderProps) {
  const pathname = usePathname();
  const { orgSlug, items: breadcrumbs } = generateBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              href="#"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Acme Inc</span>
            </Link>
            {user && (
              <>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Package className="h-5 w-5" />
                  Products
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <Users2 className="h-5 w-5" />
                  Customers
                </Link>
                <Link
                  href="#"
                  className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Settings
                </Link>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
      {user && breadcrumbs.length > 0 && orgSlug && (
        <Breadcrumb className="hidden md:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/${orgSlug}/dashboard`}>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbs.map((breadcrumb, index) => (
              <React.Fragment key={breadcrumb.href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {breadcrumb.isLast ? (
                    <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={breadcrumb.href}>{breadcrumb.name}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="ml-auto">
        {user && <AvatarDropdown user={user} baseUrl={baseUrl} />}
      </div>
    </header>
  );
}
