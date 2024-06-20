import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { User } from "@supabase/auth-js";
import { UserIcon } from "lucide-react";

type AvatarDropdownProps = {
  user: User;
};

export default function AvatarDropdown({ user }: AvatarDropdownProps) {
  const firstName = user.user_metadata?.first_name;
  const lastName = user.user_metadata?.last_name;
  const hasName = firstName && lastName;
  const avatarFallback = hasName ? (
    `${firstName[0]}${lastName[0]}`
  ) : (
    <UserIcon className="h-5 w-5 text-slate-500" />
  );
  console.log(firstName, lastName);
  return (
    <DropdownMenu>
      {/*{JSON.stringify(user)}*/}
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
        <Link href="/auth/logout">
          <DropdownMenuItem>Logout</DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
