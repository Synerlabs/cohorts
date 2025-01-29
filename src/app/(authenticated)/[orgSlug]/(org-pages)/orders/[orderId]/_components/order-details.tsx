"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Order } from "../../columns"

interface OrderDetailsProps {
  order: Order
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100)
  }

  let statusVariant: "default" | "secondary" | "destructive" | "outline"
  switch (order.status) {
    case "completed":
      statusVariant = "default"
      break
    case "failed":
      statusVariant = "destructive"
      break
    default:
      statusVariant = "outline"
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
          <CardDescription>Basic order details and status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono text-xs">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={statusVariant} className="mt-1 capitalize">
                {order.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="capitalize">{order.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="font-medium">
                {formatCurrency(order.amount, order.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>Order status and timestamps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p>{format(new Date(order.created_at), "MMM d, yyyy HH:mm")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p>
                {order.completed_at
                  ? format(new Date(order.completed_at), "MMM d, yyyy HH:mm")
                  : "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 