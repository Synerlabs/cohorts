import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Affiliate } from "@/services/affiliate.service";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/formatters";
import AffiliateActionsCell from "./affiliate-actions-cell";
import { useEffect } from "react";

interface AffiliateTableProps {
  affiliates: Affiliate[];
  affiliateStatus?: string;
  orgId: string;
  orgSlug: string;
  onStatusChange?: () => void;
}

export default function AffiliateTable({
  affiliates = [],
  affiliateStatus = "active",
  orgId,
  orgSlug,
  onStatusChange,
}: AffiliateTableProps) {
  console.log('AffiliateTable rendering with affiliates:', affiliates);
  console.log('Affiliates count:', affiliates.length);
  
  if (affiliates.length === 0) {
    console.log('No affiliates found, showing empty state');
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-muted-foreground">No affiliates found</p>
        </div>
      </div>
    );
  }

  // Log the first affiliate object to debug
  if (affiliates.length > 0) {
    console.log('First affiliate object:', affiliates[0]);
    console.log('Does it have childGroup?', !!affiliates[0].childGroup);
    console.log('Properties on affiliate:', Object.keys(affiliates[0]));
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="relative w-full overflow-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Organization</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {affiliates.map((affiliate, index) => {
            console.log(`Rendering affiliate at index ${index}:`, affiliate.id);
            return (
            <TableRow key={affiliate.id}>
              <TableCell className="font-medium">
                {affiliate.childGroup?.name || "Unknown Organization"}
                {!affiliate.childGroup && <span className="text-red-500"> (childGroup missing)</span>}
              </TableCell>
              <TableCell>
                {affiliate.tier?.product?.name || "Default Tier"}
                {affiliate.tier?.product?.price && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatCurrency(
                      affiliate.tier.product.price, 
                      affiliate.tier.product.currency || 'USD'
                    )}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant={affiliate.isActive ? "default" : "secondary"}
                  className={affiliate.isActive ? "bg-green-500" : "bg-gray-400"}
                >
                  {affiliate.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(affiliate.createdAt)}</TableCell>
              <TableCell className="text-right">
                <AffiliateActionsCell 
                  affiliate={affiliate} 
                  orgSlug={orgSlug}
                  onStatusChange={onStatusChange} 
                />
              </TableCell>
            </TableRow>
          )})}
        </TableBody>
      </Table>
    </div>
  );
} 