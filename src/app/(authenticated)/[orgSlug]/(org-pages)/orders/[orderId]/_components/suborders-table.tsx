"use client"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
}

interface Suborder {
  id: string
  order_id: string
  product: Product
  status: "completed" | "pending" | "processing" | "failed" | "cancelled"
  amount: number
  currency: string
}

interface SubordersTableProps {
  suborders: Suborder[]
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
                  {suborder.product.description && (
                    <p className="text-sm text-muted-foreground">
                      {suborder.product.description}
                    </p>
                  )}
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
