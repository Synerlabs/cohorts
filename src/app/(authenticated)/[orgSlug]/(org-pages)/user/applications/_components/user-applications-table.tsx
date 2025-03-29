"use client";

import Link from "next/link";
import { Application } from "@/services/applications.service";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Eye, Edit, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { cancelApplication } from "../_actions/cancel-application";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserApplicationsTableProps {
  applications: Application[];
  orgSlug: string;
}

export function UserApplicationsTable({ applications, orgSlug }: UserApplicationsTableProps) {
  const [applicationToCancel, setApplicationToCancel] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const { toast } = useToast();

  const handleCancelApplication = async () => {
    if (!applicationToCancel) return;
    
    try {
      setCancelPending(true);
      const result = await cancelApplication(applicationToCancel, orgSlug);
      
      toast({
        title: result.success ? "Application Cancelled" : "Error",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
      
      if (result.success) {
        // Force a page refresh to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error("Error cancelling application:", error);
      toast({
        title: "Error",
        description: "There was an error cancelling your application. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setCancelPending(false);
      setApplicationToCancel(null);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No applications found</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membership</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id}>
                <TableCell className="font-medium">{application.product.name}</TableCell>
                <TableCell>{formatDate(application.created_at)}</TableCell>
                <TableCell>
                  {application.product.price > 0 
                    ? formatCurrency(application.product.price, application.product.currency)
                    : "Free"}
                </TableCell>
                <TableCell>
                  <ApplicationStatusBadge status={application.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                    >
                      <Link href={`/@${orgSlug}/user/applications/${application.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    
                    {/* Only show edit button for pending applications */}
                    {application.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="default"
                        asChild
                      >
                        <Link href={`/@${orgSlug}/user/applications/${application.id}/edit`}>
                          <span className="flex items-center">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </span>
                        </Link>
                      </Button>
                    )}
                    
                    {/* Show cancel button for pending and pending_payment applications */}
                    {(application.status === 'pending' || application.status === 'pending_payment') && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setApplicationToCancel(application.id)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!applicationToCancel} onOpenChange={(open) => !open && setApplicationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this application? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Application</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelApplication}
              disabled={cancelPending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {cancelPending ? "Processing..." : "Yes, Cancel Application"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ApplicationStatusBadge({ status }: { status: Application['status'] }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'pending_payment':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Pending Payment</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
} 