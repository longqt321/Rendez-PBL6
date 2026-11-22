import { useMemo, useState, type ReactNode } from "react"
import {
  columnVisibilityFeature,
  createSortedRowModel,
  flexRender,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Columns3Icon } from "lucide-react"
import { ErrorState } from "@/components/shared/error-state"
import { LoadMore } from "@/components/shared/load-more"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

const ADMIN_TABLE_FEATURES = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
})

export type AdminTableFeatures = typeof ADMIN_TABLE_FEATURES

export type AdminColumnDef<TData extends RowData> = ColumnDef<AdminTableFeatures, TData, unknown>

interface AdminDataTableProps<TData extends RowData> {
  readonly columns: readonly AdminColumnDef<TData>[]
  readonly data: readonly TData[]
  readonly getRowId?: (row: TData, index: number) => string
  readonly initialSorting?: SortingState
  readonly initialColumnVisibility?: Record<string, boolean>
  readonly isPending?: boolean
  readonly isFetching?: boolean
  readonly isError?: boolean
  readonly errorTitle?: string
  readonly onRetry?: () => void
  readonly emptyState?: ReactNode
  readonly onRowClick?: (row: TData) => void
  readonly rowClassName?: (row: TData) => string | undefined
  readonly enableColumnToggle?: boolean
  readonly toolbarExtra?: ReactNode
  readonly pagination?: {
    hasNextPage: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
    loadingLabel?: string
    endMessage?: string
  }
  readonly skeletonRows?: number
  readonly ariaLabel?: string
}

export function AdminDataTable<TData extends RowData>({
  columns,
  data,
  getRowId,
  initialSorting = [],
  initialColumnVisibility = {},
  isPending = false,
  isFetching = false,
  isError = false,
  errorTitle = "Không tải được dữ liệu bảng",
  onRetry,
  emptyState,
  onRowClick,
  rowClassName,
  enableColumnToggle = false,
  toolbarExtra,
  pagination,
  skeletonRows = 6,
  ariaLabel,
}: AdminDataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  const [columnVisibility, setColumnVisibility] =
    useState<Record<string, boolean>>(initialColumnVisibility)

  const emptyData = useMemo<TData[]>(() => [], [])
  const stableColumns = useMemo(() => [...columns], [columns])
  const stableData = useMemo(() => (data.length === 0 ? emptyData : [...data]), [data, emptyData])

  const tableInstance = useTable<AdminTableFeatures, TData>({
    features: ADMIN_TABLE_FEATURES,
    data: stableData,
    columns: stableColumns,
    getRowId,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  })

  const hideableColumns = tableInstance.getAllLeafColumns().filter((column) => column.getCanHide())
  const showToolbar = Boolean(toolbarExtra) || (enableColumnToggle && hideableColumns.length > 0)

  const renderBody = () => {
    if (isPending && data.length === 0) {
      return (
        <div className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
          <Skeleton className="h-9 w-full rounded-md" />
          {Array.from({ length: skeletonRows }).map((_, idx) => (
            <Skeleton key={`tbl-skel-${idx}`} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )
    }

    if (isError && data.length === 0) {
      return <ErrorState variant="plain" title={errorTitle} onRetry={onRetry} />
    }

    if (data.length === 0) {
      return (
        <div className={cn("transition-opacity", isFetching && "opacity-60")}>
          {emptyState ?? (
            <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Chưa có dữ liệu phù hợp.
            </p>
          )}
        </div>
      )
    }

    return (
      <>
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-border/80 bg-card shadow-(--shadow-soft) transition-opacity duration-150",
            isFetching && "opacity-65",
          )}
          aria-busy={isFetching || undefined}
        >
          {isFetching ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-primary/70"
              aria-hidden="true"
            />
          ) : null}
          <Table aria-label={ariaLabel}>
            <TableHeader className="bg-muted/45">
              {tableInstance.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sorted = header.column.getIsSorted()
                    return (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder ? null : canSort ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-ml-2 h-8 gap-1 px-2 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {sorted === "asc" ? (
                              <ArrowUpIcon className="size-3 text-primary" aria-hidden="true" />
                            ) : sorted === "desc" ? (
                              <ArrowDownIcon className="size-3 text-primary" aria-hidden="true" />
                            ) : (
                              <ArrowUpDownIcon
                                className="size-3 text-muted-foreground/60"
                                aria-hidden="true"
                              />
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs font-semibold text-foreground">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </span>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {tableInstance.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={cn(onRowClick && "cursor-pointer", rowClassName?.(row.original))}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {pagination ? (
          <LoadMore
            hasNextPage={pagination.hasNextPage}
            isFetchingNextPage={pagination.isFetchingNextPage}
            onLoadMore={pagination.onLoadMore}
            loadingLabel={pagination.loadingLabel}
            endMessage={pagination.endMessage}
          />
        ) : null}
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {showToolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{toolbarExtra}</div>
          {enableColumnToggle && hideableColumns.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" />
                }
              >
                <Columns3Icon className="size-3.5" aria-hidden="true" />
                Cột hiển thị
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Chọn cột hiển thị</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {hideableColumns.map((column) => {
                    const label =
                      typeof column.columnDef.header === "string"
                        ? column.columnDef.header
                        : column.id
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}

      {renderBody()}
    </div>
  )
}
