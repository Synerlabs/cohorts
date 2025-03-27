import { OrgAccessHOCProps, withOrgAccess } from "@/lib/hoc/org";
import { getUserMembershipApplicationsWithPagination } from "@/services/applications.service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Suspense } from "react";
import { UserApplicationsTable } from "./_components/user-applications-table";
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function UserApplicationsPage({ org, user, searchParams }: OrgAccessHOCProps) {
  // Ensure user is defined
  if (!user) {
    notFound(); // Redirect to 404 if user is not available
  }

  const _searchParams = await searchParams || {};
  const tab = (_searchParams?.tab || "all") as string;
  const page = parseInt(_searchParams?.page as string || "1");
  const limit = 10;
  const offset = (page - 1) * limit;

  // Filter applications based on the selected tab
  let statusFilter = undefined;
  switch (tab) {
    case "pending":
      statusFilter = "pending";
      break;
    case "approved":
      statusFilter = "approved";
      break;
    case "rejected":
      statusFilter = "rejected";
      break;
    case "pending_payment":
      statusFilter = "pending_payment";
      break;
    default:
      statusFilter = undefined; // All applications
  }

  // Get user applications with pagination
  const { applications, total } = await getUserMembershipApplicationsWithPagination(
    user.id,
    org.id,
    limit,
    offset
  );

  // Filter the applications by status if needed
  const filteredApplications = statusFilter 
    ? applications.filter(app => app.status === statusFilter)
    : applications;

  // Calculate pagination details
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Applications</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your membership applications.
          </p>
        </div>

        <Tabs value={tab} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={`/@${org.slug}/user/applications`}>All</Link>
            </TabsTrigger>
            <TabsTrigger value="pending" asChild>
              <Link href={`/@${org.slug}/user/applications?tab=pending`}>Pending</Link>
            </TabsTrigger>
            <TabsTrigger value="pending_payment" asChild>
              <Link href={`/@${org.slug}/user/applications?tab=pending_payment`}>
                Pending Payment
              </Link>
            </TabsTrigger>
            <TabsTrigger value="approved" asChild>
              <Link href={`/@${org.slug}/user/applications?tab=approved`}>
                Approved
              </Link>
            </TabsTrigger>
            <TabsTrigger value="rejected" asChild>
              <Link href={`/@${org.slug}/user/applications?tab=rejected`}>
                Rejected
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Suspense fallback={<div>Loading applications...</div>}>
          <UserApplicationsTable 
            applications={filteredApplications} 
            orgSlug={org.slug}
          />
        </Suspense>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              {hasPrevPage && (
                <PaginationItem>
                  <PaginationPrevious 
                    href={`/@${org.slug}/user/applications?tab=${tab}&page=${page - 1}`} 
                  />
                </PaginationItem>
              )}
              
              {Array.from({ length: totalPages }).map((_, index) => (
                <PaginationItem key={index}>
                  <PaginationLink 
                    href={`/@${org.slug}/user/applications?tab=${tab}&page=${index + 1}`}
                    isActive={page === index + 1}
                  >
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              {hasNextPage && (
                <PaginationItem>
                  <PaginationNext 
                    href={`/@${org.slug}/user/applications?tab=${tab}&page=${page + 1}`} 
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  );
}

// No special permissions needed - users can view their own applications
export default withOrgAccess(UserApplicationsPage, { 
  onAccessDenied: { action: "error" }
}); 