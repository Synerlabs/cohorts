"use client";

import { useRouter } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export type AffiliateStatusFilterType = "active" | "pending" | "all";

interface AffiliateStatusFilterProps {
  affiliateStatus: AffiliateStatusFilterType;
  tab: string;
  orgSlug: string;
}

export default function AffiliateStatusFilter({
  affiliateStatus,
  tab,
  orgSlug
}: AffiliateStatusFilterProps) {
  const router = useRouter();

  const handleStatusChange = (value: string) => {
    if (value === "active") {
      router.push(`/@${orgSlug}/affiliates${tab !== "affiliates" ? `?tab=${tab}` : ""}`);
    } else {
      router.push(`/@${orgSlug}/affiliates?${tab !== "affiliates" ? `tab=${tab}&` : ""}status=${value}`);
    }
  };

  return (
    <div className="flex items-center">
      <Select defaultValue={affiliateStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
} 