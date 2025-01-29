"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  VisibilityState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DataTableToolbar } from "./components/data-table-toolbar"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  orgSlug: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  orgSlug,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get current values from URL
  const page = searchParams.get("page") ? parseInt(searchParams.get("page")!) - 1 : 0
  const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!) : 10
  const sortBy = searchParams.get("sortBy") || "created_at"
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc"
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || "all"

  const [sortingState, setSortingState] = React.useState<SortingState>([
    { id: sortBy, desc: sortOrder === "desc" }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  // Helper function to update URL search params
  const updateSearchParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams)
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })

    router.push(`/${orgSlug}/orders?${params.toString()}`)
  }

  const table = useReactTable({
    data,
    columns,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: (updatedSorting) => {
      if (Array.isArray(updatedSorting)) {
        setSortingState(updatedSorting)
        if (updatedSorting.length > 0) {
          const [sort] = updatedSorting
          updateSearchParams({
            sortBy: sort.id,
            sortOrder: sort.desc ? "desc" : "asc"
          })
        }
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting: sortingState,
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: page,
        pageSize,
      },
    },
    manualPagination: true,
  })

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchValue={search}
        onSearchChange={(value) => {
          updateSearchParams({ search: value, page: "1" })
        }}
        statusValue={status}
        onStatusChange={(value) => {
          updateSearchParams({ status: value, page: "1" })
        }}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, data.length)} of {data.length} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateSearchParams({ 
                page: (page).toString()
              })
            }}
            disabled={page === 0}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateSearchParams({ 
                page: (page + 2).toString()
              })
            }}
            disabled={page >= pageCount - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
} 
