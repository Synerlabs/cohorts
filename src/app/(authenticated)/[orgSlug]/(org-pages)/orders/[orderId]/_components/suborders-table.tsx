"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ISuborderData, SuborderType } from "@/lib/types/suborder"

interface SubordersTableProps {
  suborders: ISuborderData[]
}

export function SubordersTable({ suborders }: SubordersTableProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100)
  }

  const getStatusVariant = (status: ISuborderData['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default"
      case "failed":
        return "destructive"
      case "processing":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getTypeLabel = (type: SuborderType) => {
    switch (type) {
      case "membership":
        return "Membership"
      case "product":
        return "Product"
      case "event":
        return "Event"
      case "promotion":
        return "Promotion"
      default:
        return type
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suborders.map((suborder) => (
            <TableRow key={suborder.id}>
              <TableCell className="font-mono text-xs">
                {suborder.id}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{suborder.product?.name || 'Unknown Product'}</p>
                  {suborder.product?.description && (
                    <p className="text-sm text-muted-foreground">
                      {suborder.product.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {getTypeLabel(suborder.type)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={getStatusVariant(suborder.status)}
                  className="capitalize"
                >
                  {suborder.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(suborder.amount, suborder.currency)}
              </TableCell>
              <TableCell>
                {format(new Date(suborder.created_at), "MMM d, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                {format(new Date(suborder.updated_at), "MMM d, yyyy HH:mm")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 
