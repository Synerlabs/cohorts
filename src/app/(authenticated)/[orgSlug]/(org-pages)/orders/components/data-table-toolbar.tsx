"use client"

import { Table } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchValue: string
  onSearchChange: (value: string) => void
  statusValue: string
  onStatusChange: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
}: DataTableToolbarProps<TData>) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search orders..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select
          value={statusValue}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
} 
