"use client";

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
import { UserIcon } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type AvatarDropdownProps = {
  user: User;
  baseUrl?: string;
};

export default function AvatarDropdown({ user, baseUrl }: AvatarDropdownProps) {
  const supabase = createClientComponentClient();

  const handleSignOut = async () => {
    try {
      // Extract orgSlug from baseUrl if it exists
      const logoutUrl = baseUrl 
        ? `/auth/logout?orgSlug=${baseUrl}`
        : '/auth/logout';
        console.log(logoutUrl);
      window.location.href = logoutUrl;
    } catch (e) {
      console.error("Exception during sign out:", e);
    }
  };

  const firstName = user.user_metadata?.first_name;
  const lastName = user.user_metadata?.last_name;
  const hasName = firstName && lastName;
  const avatarFallback = hasName ? (
    `${firstName[0]}${lastName[0]}`
  ) : (
    <UserIcon className="h-5 w-5 text-slate-500" />
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src="https://github.com/shadcn.pngx" />
          <AvatarFallback className="border bg-background">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {hasName ? `${firstName} ${lastName}` : "My Account"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>My Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuItem>Support</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
