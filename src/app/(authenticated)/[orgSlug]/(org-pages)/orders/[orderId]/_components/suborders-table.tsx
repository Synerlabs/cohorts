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
import { useRef, useTransition, useState, useEffect } from "react";
import { updateSuborderStatusAction } from "./suborder-status.actions";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Check, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { processSingleSuborderAction } from "./process-single-suborder.action";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { rejectSingleSuborderAction } from "./reject-single-suborder.action";

interface SubordersTableProps {
  suborders: ISuborderData[]
  canProcess: boolean
  groupId: string
  userId: string
}

export function SubordersTable({ suborders, canProcess, groupId, userId }: SubordersTableProps) {
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

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const { toast } = useToast();
  const [openSuborderId, setOpenSuborderId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (editingId && selectRefs.current[editingId]) {
      selectRefs.current[editingId]?.focus();
    }
  }, [editingId]);

  return (
    <>
      <Sheet open={!!openSuborderId} onOpenChange={open => !open && setOpenSuborderId(null)}>
        <SheetContent className="max-w-lg w-full">
          {openSuborderId && (() => {
            const suborder = suborders.find(s => s.id === openSuborderId);
            if (!suborder) return null;
            if (suborder.type !== "membership") return null;
            // Show all membership details
            return (
              <div className="flex flex-col h-full">
                <SheetHeader>
                  <SheetTitle>Process Membership Suborder</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-4">
                  <div>
                    <div className="font-semibold">User:</div>
                    <div>{suborder.metadata?.user_name || suborder.metadata?.user_email || suborder.metadata?.user_id}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Tier:</div>
                    <div>{suborder.product?.name}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Membership ID:</div>
                    <div>{suborder.metadata?.membership_id || "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Start Date:</div>
                    <div>{suborder.metadata?.start_date || "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold">End Date:</div>
                    <div>{suborder.metadata?.end_date || "-"}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Other Metadata:</div>
                    <pre className="bg-muted/30 rounded p-2 text-xs overflow-x-auto">{JSON.stringify(suborder.metadata, null, 2)}</pre>
                  </div>
                </div>
                <SheetFooter className="flex gap-2">
                  <form
                    action={async (formData) => {
                      setIsProcessing(true);
                      await processSingleSuborderAction(formData);
                      setIsProcessing(false);
                      setOpenSuborderId(null);
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="suborderId" value={suborder.id} />
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="userId" value={userId} />
                    <Button type="submit" variant="default" disabled={isProcessing}>
                      Approve
                    </Button>
                  </form>
                  <form
                    action={async (formData) => {
                      setIsProcessing(true);
                      await rejectSingleSuborderAction(formData);
                      setIsProcessing(false);
                      setOpenSuborderId(null);
                      router.refresh();
                    }}
                  >
                    <input type="hidden" name="suborderId" value={suborder.id} />
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="userId" value={userId} />
                    <Button type="submit" variant="destructive" disabled={isProcessing}>
                      Reject
                    </Button>
                  </form>
                  <SheetClose asChild>
                    <Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button>
                  </SheetClose>
                </SheetFooter>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>
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
              {canProcess && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {suborders.map((suborder) => (
              <TableRow key={suborder.id} className={editingId === suborder.id ? "bg-muted/40" : undefined}>
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
                  {editingId !== suborder.id ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(suborder.status)} className="capitalize">{suborder.status}</Badge>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingId(suborder.id)}
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
                            await updateSuborderStatusAction(formData);
                            setEditingId(null);
                            router.refresh();
                            toast({ title: "Status updated" });
                          } catch {
                            toast({ title: "Failed to update status", variant: "destructive" });
                          }
                        });
                      }}
                    >
                      <input type="hidden" name="suborderId" value={suborder.id} />
                      <select
                        name="status"
                        defaultValue={suborder.status}
                        ref={el => { selectRefs.current[suborder.id] = el; return; }}
                        className="capitalize border rounded px-2 py-1"
                        onKeyDown={e => {
                          if (e.key === "Escape") setEditingId(null);
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
                        onClick={() => setEditingId(null)}
                        disabled={isPending}
                        aria-label="Cancel status edit"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </form>
                  )}
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
                {canProcess && (
                  <TableCell>
                    {suborder.type === "membership" ? (
                      <Button type="button" size="icon" variant="ghost" aria-label="Process suborder" onClick={() => setOpenSuborderId(suborder.id)}>
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : (
                      <form action={processSingleSuborderAction} method="post">
                        <input type="hidden" name="suborderId" value={suborder.id} />
                        <input type="hidden" name="groupId" value={groupId} />
                        <input type="hidden" name="userId" value={userId} />
                        <Button type="submit" size="icon" variant="ghost" aria-label="Process suborder">
                          <Play className="w-4 h-4" />
                        </Button>
                      </form>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
} 
