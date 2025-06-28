"use client"

import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { useRef, useTransition, useState, useEffect } from "react";
import { updateOrderStatusAction } from "./order-status.actions";
import { useRouter } from "next/navigation";
import { 
  Pencil, 
  Loader2, 
  Check, 
  X, 
  ClipboardCopy, 
  Info, 
  BadgeCheck, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Package, 
  CreditCard, 
  Download,
  Printer,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { differenceInDays, formatDistanceToNow } from "date-fns";
import { ISuborderData } from "@/lib/types/suborder";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

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
  suborders: ISuborderData[]
}

interface OrderDetailsProps {
  order: Order
}

// CopyButton for clipboard functionality
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);
  const handleCopy = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(text);
      toast({ description: "Copied to clipboard", duration: 2000 });
    } catch {
      toast({ description: "Failed to copy", variant: "destructive", duration: 2000 });
    } finally {
      setCopying(false);
    }
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy} disabled={copying} aria-label={label}>
            <ClipboardCopy className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

  // Helper to get background gradient based on status
  const getStatusGradient = () => {
    switch (order.status) {
      case "completed":
        return "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100";
      case "processing":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100";
      case "failed":
        return "bg-gradient-to-r from-red-50 to-rose-50 border-red-100";
      case "cancelled":
        return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-100";
      default:
        return "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100";
    }
  };

  // Format a date relative to now (e.g. "2 days ago")
  const formatRelativeDate = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "";
    }
  };

  // Mock function to print order details
  const handlePrint = () => {
    toast({ description: "Preparing print version...", duration: 2000 });
    window.print();
  };

  // Mock function to download order details
  const handleDownload = () => {
    toast({ description: "Order details downloading...", duration: 2000 });
    // Actual implementation would generate and download a PDF/CSV
  };

  // --- Ecommerce-inspired layout with modern UI enhancements ---
  return (
    <div className="space-y-8">
      {/* Order Summary Card */}
      <Card className={`shadow-sm overflow-hidden border ${getStatusGradient()}`}>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary/80" />
                <CardTitle className="text-xl md:text-2xl font-bold">Order #{order.id.slice(0, 8)}</CardTitle>
                <CopyButton text={order.id} label="Copy Full Order ID" />
              </div>
              <CardDescription className="mt-2 text-sm">
                Placed on {format(new Date(order.created_at), "MMM d, yyyy")} at {format(new Date(order.created_at), "HH:mm")}
                <span className="ml-2 text-xs">({formatRelativeDate(order.created_at)})</span>
              </CardDescription>
            </div>
            <div className="flex flex-col md:items-end gap-1">
              <div className="flex items-center gap-2">
                {!editing ? (
                  <>
                    <Badge variant={statusVariant} className="capitalize text-sm px-3 py-1 rounded-full">{order.status}</Badge>
                    {order.status !== "completed" && order.status !== "cancelled" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              type="button" 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => setEditing(true)} 
                              aria-label="Edit status"
                              className="h-6 w-6"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Status</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </>
                ) : (
                  <form 
                    className="flex items-center gap-1 bg-muted/50 rounded-full pl-2 pr-1"
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
                      className="text-xs capitalize bg-transparent border-none px-1 py-1 focus:outline-none focus:ring-0"
                      onKeyDown={e => { if (e.key === "Escape") setEditing(false); }}
                      disabled={isPending}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <Button type="submit" size="icon" variant="ghost" className="h-6 w-6" disabled={isPending}>
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)} disabled={isPending}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                )}
              </div>
              <div className="text-3xl font-bold mt-1">{formatCurrency(order.amount, order.currency)}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-0 pt-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-white/80 rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Badge variant={paymentVariant} className="rounded-full capitalize px-3">{paymentStatus}</Badge>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(totalPaid, order.currency)} of {formatCurrency(order.amount, order.currency)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              {remainingAmount > 0 ? (
                <span className="text-sm text-red-600 font-medium">
                  {formatCurrency(remainingAmount, order.currency)} remaining
                </span>
              ) : (
                <span className="text-sm text-green-600 font-medium">Fully paid</span>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2 pt-4 pb-4">
          <Button variant="outline" size="sm" className="h-8" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </CardFooter>
      </Card>

      {/* Main content: two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left/Main Column */}
        <div className="flex-1 space-y-6">
          {/* Order Items (Suborders) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary/80" />
                Order Items
              </CardTitle>
              <CardDescription>Items and services in this order</CardDescription>
            </CardHeader>
            <CardContent>
              {order.suborders && order.suborders.length > 0 ? (
                <div className="space-y-3">
                  {order.suborders.map((sub: ISuborderData, idx: number) => (
                    <div 
                      key={sub.id} 
                      className="p-4 rounded-lg border border-muted hover:border-muted-foreground/20 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary"
                              aria-hidden="true"
                            >
                              {sub.product?.type === 'membership' ? 
                                <BadgeCheck className="h-5 w-5" /> : 
                                <Package className="h-5 w-5" />
                              }
                            </div>
                            <div>
                              <div className="font-medium group-hover:text-primary transition-colors">
                                {sub.product?.name || "Product"}
                              </div>
                              <div className="text-xs text-muted-foreground">{sub.product?.type}</div>
                            </div>
                          </div>
                          {sub.product?.description && (
                            <div className="text-sm text-muted-foreground mt-2 ml-12">
                              {sub.product.description}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 ml-12 md:ml-0">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Qty:</span>{" "}
                            <span className="font-medium">{sub.metadata && sub.metadata.quantity ? sub.metadata.quantity : 1}</span>
                          </div>
                          <div className="text-base font-medium">{formatCurrency(sub.amount, sub.currency)}</div>
                          <Badge 
                            variant={sub.status === 'completed' ? 'default' : sub.status === 'failed' ? 'destructive' : 'outline'} 
                            className="capitalize rounded-full"
                          >
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <div className="text-muted-foreground">No items in this order</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary/80" />
                Order Timeline
              </CardTitle>
              <CardDescription>History and status updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l-2 border-muted pl-6 py-2 ml-4 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" aria-hidden="true"></div>
                  </div>
                  <div>
                    <div className="flex flex-col">
                      <div className="font-medium">Order Created</div>
                      <div className="text-sm text-muted-foreground">{format(new Date(order.created_at), "MMM d, yyyy HH:mm")}</div>
                      <div className="text-xs text-muted-foreground mt-1">Order #{order.id.slice(0, 8)} was placed</div>
                    </div>
                  </div>
                </div>

                {order.payments && order.payments.length > 0 && (
                  <div className="relative">
                    <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true"></div>
                    </div>
                    <div>
                      <div className="flex flex-col">
                        <div className="font-medium">Payment Received</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(order.payments[0].created_at), "MMM d, yyyy HH:mm")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Payment of {formatCurrency(order.payments[0].amount, order.currency)} was processed
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === "processing" && (
                  <div className="relative">
                    <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true"></div>
                    </div>
                    <div>
                      <div className="flex flex-col">
                        <div className="font-medium">Processing</div>
                        <div className="text-sm text-muted-foreground">In progress</div>
                        <div className="text-xs text-muted-foreground mt-1">Order is being processed</div>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === "completed" && order.completed_at && (
                  <div className="relative">
                    <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500" aria-hidden="true"></div>
                    </div>
                    <div>
                      <div className="flex flex-col">
                        <div className="font-medium">Completed</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(order.completed_at), "MMM d, yyyy HH:mm")}</div>
                        <div className="text-xs text-muted-foreground mt-1">Order has been completed successfully</div>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === "failed" && order.completed_at && (
                  <div className="relative">
                    <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden="true"></div>
                    </div>
                    <div>
                      <div className="flex flex-col">
                        <div className="font-medium">Failed</div>
                        <div className="text-sm text-muted-foreground">{format(new Date(order.completed_at), "MMM d, yyyy HH:mm")}</div>
                        <div className="text-xs text-muted-foreground mt-1">Order processing failed</div>
                      </div>
                    </div>
                  </div>
                )}

                {order.status === "cancelled" && (
                  <div className="relative">
                    <div className="absolute -left-[29px] -top-1 w-6 h-6 rounded-full border-2 border-muted bg-background flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-500" aria-hidden="true"></div>
                    </div>
                    <div>
                      <div className="flex flex-col">
                        <div className="font-medium">Cancelled</div>
                        <div className="text-sm text-muted-foreground">Order has been cancelled</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right/Sidebar Column */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
          {/* Order Info */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4 text-primary/80" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <div className="flex items-center">
                    <span className="font-mono text-xs select-all">{order.id}</span>
                    <CopyButton text={order.id} label="Copy Order ID" />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="capitalize">{order.type}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  {!editing ? (
                    <div className="flex items-center gap-1">
                      <Badge variant={statusVariant} className="capitalize">{order.status}</Badge>
                      {order.status !== "completed" && order.status !== "cancelled" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit Status</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  ) : (
                    <form 
                      className="flex items-center gap-1 bg-muted/50 rounded px-1"
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
                        className="text-xs capitalize bg-transparent border-none py-1 focus:outline-none focus:ring-0"
                        onKeyDown={e => { if (e.key === "Escape") setEditing(false); }}
                        disabled={isPending}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Button type="submit" size="icon" variant="ghost" className="h-5 w-5 p-0" disabled={isPending}>
                        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-5 w-5 p-0" onClick={() => setEditing(false)} disabled={isPending}>
                        <X className="h-3 w-3" />
                      </Button>
                    </form>
                  )}
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Placed</span>
                  <span>{format(new Date(order.created_at), "MMM d, yyyy")}</span>
                </div>
                {order.completed_at && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{format(new Date(order.completed_at), "MMM d, yyyy")}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Breakdown */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-primary/80" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.amount, order.currency)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{formatCurrency(order.amount, order.currency)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600">{formatCurrency(totalPaid, order.currency)}</span>
                </div>
                {remainingAmount > 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium text-red-600">{formatCurrency(remainingAmount, order.currency)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={paymentVariant} className="capitalize">{paymentStatus}</Badge>
                </div>
              </div>
            </CardContent>
            
            {/* Payment Method Section */}
            {order.payments && order.payments.length > 0 && (
              <>
                <Separator className="mx-6" />
                <CardHeader className="pb-3 pt-4">
                  <CardTitle className="text-base">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.payments.map((payment, idx) => (
                      <div key={payment.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-primary/80" />
                          </div>
                          <div>
                            <div className="capitalize">{payment.type}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(payment.created_at), "MMM d, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{formatCurrency(payment.amount, payment.currency)}</div>
                          <div className="text-xs text-right">
                            <Badge 
                              variant={payment.status === 'paid' ? 'default' : payment.status === 'failed' ? 'destructive' : 'outline'} 
                              className="text-[10px] rounded-full h-5"
                            >
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
} 
