"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Memberships & Affiliations</h2>
        <Skeleton className="h-10 w-40" />
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="memberships">Memberships</TabsTrigger>
          <TabsTrigger value="tiers">Subscription Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers">
          {/* Filter tabs */}
          <div className="mb-4 border-b pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <Tabs defaultValue="all" className="w-auto">
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs h-7 px-3">All</TabsTrigger>
                  <TabsTrigger value="membership" className="text-xs h-7 px-3 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Memberships
                  </TabsTrigger>
                  <TabsTrigger value="organization" className="text-xs h-7 px-3 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Organizations
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Skeleton cards for subscription plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="relative overflow-hidden">
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex-grow py-2 px-4 space-y-3">
                  <Skeleton className="h-7 w-28 mb-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="px-4 pt-0 pb-4">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 