"use client"

import * as React from "react"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  Header,
  HeaderGroup,
  Row,
  Cell,
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    total: number
  }
  sorting?: {
    sortBy: string
    sortOrder: 'asc' | 'desc'
  }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onSortingChange?: (sorting: { sortBy: string; sortOrder: 'asc' | 'desc' }) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  sorting,
  onPaginationChange,
  onSortingChange,
}: DataTableProps<TData, TValue>) {
  const [sortingState, setSortingState] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updatedSorting: SortingState) => {
      setSortingState(updatedSorting)
      if (onSortingChange && updatedSorting.length > 0) {
        const [sort] = updatedSorting
        onSortingChange({
          sortBy: sort.id,
          sortOrder: sort.desc ? 'desc' : 'asc'
        })
      }
    },
    state: {
      sorting: sortingState,
      pagination: pagination ? {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      } : undefined,
    },
  })

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<TData, TValue>) => {
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
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, TValue>) => (
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
      {pagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {pagination.total} total rows
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange?.({ 
                pageIndex: pagination.pageIndex - 1,
                pageSize: pagination.pageSize 
              })}
              disabled={pagination.pageIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPaginationChange?.({ 
                pageIndex: pagination.pageIndex + 1,
                pageSize: pagination.pageSize 
              })}
              disabled={pagination.pageIndex >= pagination.pageCount - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 
