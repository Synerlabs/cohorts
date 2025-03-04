"use client";

import { useRouter, useParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AffiliationTabsProps {
  activeTab: string;
}

export function AffiliationTabs({ activeTab }: AffiliationTabsProps) {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const handleTabChange = (value: string) => {
    router.push(`/${orgSlug}/affiliations?tab=${value}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="host">Host Organization</TabsTrigger>
        <TabsTrigger value="affiliate">Affiliate Organization</TabsTrigger>
      </TabsList>
    </Tabs>
  );
} 