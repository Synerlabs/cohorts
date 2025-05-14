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
import { useRef, useTransition, useState, useEffect } from "react";
import { updateOrderStatusAction } from "./order-status.actions";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface Payment {
  id: string
  amount: number
  currency: string
  status: "paid" | "pending" | "failed"
  type: "stripe" | "manual" | "upload"
  created_at: string
}

interface Order {
  id: string
  status: "completed" | "pending" | "processing" | "failed" | "cancelled"
  type: string
  amount: number
  currency: string
  created_at: string
  completed_at: string | null
  payments: Payment[]
}

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

  // Calculate total amount paid from paid payments only
  const totalPaid = order.payments
    .filter(p => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  // Calculate remaining amount
  const remainingAmount = order.amount - totalPaid

  // Determine payment status
  let paymentStatus: "Paid" | "Partially Paid" | "Unpaid"
  let paymentVariant: "default" | "secondary" | "outline"

  if (remainingAmount <= 0) {
    paymentStatus = "Paid"
    paymentVariant = "default"
  } else if (totalPaid > 0) {
    paymentStatus = "Partially Paid"
    paymentVariant = "secondary"
  } else {
    paymentStatus = "Unpaid"
    paymentVariant = "outline"
  }

  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

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
              {!editing ? (
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant} className="capitalize">{order.status}</Badge>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(true)}
                    aria-label="Edit status"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <form
                  className="flex items-center gap-2 bg-muted/40 rounded px-2 py-1"
                  action={async (formData) => {
                    startTransition(async () => {
                      try {
                        await updateOrderStatusAction(formData);
                        setEditing(false);
                        router.refresh();
                        toast({ title: "Status updated", variant: "default" });
                      } catch {
                        toast({ title: "Failed to update status", variant: "destructive" });
                      }
                    });
                  }}
                >
                  <input type="hidden" name="orderId" value={order.id} />
                  <select
                    name="status"
                    defaultValue={order.status}
                    ref={selectRef}
                    className="capitalize border rounded px-2 py-1"
                    onKeyDown={e => {
                      if (e.key === "Escape") setEditing(false);
                    }}
                    disabled={isPending}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <Button type="submit" size="icon" variant="ghost" disabled={isPending} aria-label="Save status">
                    {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    disabled={isPending}
                    aria-label="Cancel status edit"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </form>
              )}
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
          <CardTitle>Payment Status</CardTitle>
          <CardDescription>Payment progress and timeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="font-medium">
                {formatCurrency(order.amount, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="font-medium text-green-600">
                {formatCurrency(totalPaid, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className={`font-medium ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(remainingAmount, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <Badge 
                variant={paymentVariant}
                className="mt-1"
              >
                {paymentStatus}
              </Badge>
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
