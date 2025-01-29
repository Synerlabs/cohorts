"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { DataTableColumnHeader } from "./components/data-table-column-header"

// This type is used to define the shape of our data.
export type Order = {
  id: string
  type: string
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  amount: number
  currency: string
  created_at: string
  completed_at: string | null
  suborders: Array<{
    id: string
    status: string
    amount: number
    currency: string
    product: {
      id: string
      name: string
      type: string
    }
  }>
}

export const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Order ID" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
  },
  {
    accessorKey: "type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="capitalize">
        {row.getValue("type")}
      </Badge>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as Order["status"]
      
      let variant: "default" | "secondary" | "destructive" | "outline"
      switch (status) {
        case "completed":
          variant = "default"
          break
        case "failed":
          variant = "destructive"
          break
        default:
          variant = "outline"
      }

      return (
        <Badge variant={variant} className="capitalize">
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number
      const currency = row.original.currency

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount / 100)

      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => format(new Date(row.getValue("created_at")), "MMM d, yyyy"),
  },
  {
    accessorKey: "completed_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("completed_at") as string | null
      return date ? format(new Date(date), "MMM d, yyyy") : "-"
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const order = row.original

      return (
        <Button
          variant="ghost"
          onClick={() => {
            // Handle view details
          }}
        >
          View Details
        </Button>
      )
    },
  },
] 
