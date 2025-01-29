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

interface Payment {
  id: string
  amount: number
  currency: string
  status: "paid" | "pending" | "failed"
  type: "stripe" | "manual" | "upload"
  created_at: string
}

interface PaymentsTableProps {
  payments: Payment[]
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
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
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id}>
              <TableCell className="font-mono text-xs">
                {payment.id}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {payment.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={
                    payment.status === "paid"
                      ? "default"
                      : payment.status === "failed"
                      ? "destructive"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {payment.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(payment.amount, payment.currency)}
              </TableCell>
              <TableCell>
                {format(new Date(payment.created_at), "MMM d, yyyy HH:mm")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 
