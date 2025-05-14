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
import { Pencil, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

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

  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (editingId && selectRefs.current[editingId]) {
      selectRefs.current[editingId]?.focus();
    }
  }, [editingId]);

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
                  <div className="flex items-center gap-2 group">
                    <Badge variant={getStatusVariant(suborder.status)} className="capitalize">{suborder.status}</Badge>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="opacity-60 group-hover:opacity-100 transition"
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
} 
