"use client"

import { Order } from "../../columns"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SubordersTableProps {
  suborders: Order["suborders"]
}

export function SubordersTable({ suborders }: SubordersTableProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
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
                  <p className="font-medium">{suborder.product.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {suborder.product.type}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={
                    suborder.status === "completed"
                      ? "default"
                      : suborder.status === "failed"
                      ? "destructive"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {suborder.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(suborder.amount, suborder.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 