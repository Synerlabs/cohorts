"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, XCircle, Users, Archive, Hourglass } from "lucide-react";

interface MembershipStatusFilterProps {
  membershipStatus: string;
  tab: string;
  orgSlug: string;
}

export default function MembershipStatusFilter({
  membershipStatus,
  tab,
  orgSlug,
}: MembershipStatusFilterProps) {
  const router = useRouter();

  // Function to generate URL with status
  const getStatusUrl = (status: string) => {
    if (tab === "members" && status === "active") {
      return `/@${orgSlug}/members`;
    }
    
    const query = new URLSearchParams();
    if (tab !== "members") query.set("tab", tab);
    if (status !== "active") query.set("status", status);
    
    const queryString = query.toString();
    return `/@${orgSlug}/members${queryString ? `?${queryString}` : ""}`;
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="membership-status" className="text-sm font-medium text-muted-foreground">
        Status:
      </label>
      <Select 
        defaultValue={membershipStatus}
        onValueChange={(value) => {
          router.push(getStatusUrl(value));
        }}
      >
        <SelectTrigger id="membership-status" className="w-[180px] h-9">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active" className="flex items-center">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Active</span>
            </div>
          </SelectItem>
          <SelectItem value="inactive">
            <div className="flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-orange-500" />
              <span>Pending Invites</span>
            </div>
          </SelectItem>
          <SelectItem value="deleted">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4 text-destructive" />
              <span>Deleted</span>
            </div>
          </SelectItem>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>All (Active+Pending)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 