import { useMemo, useState } from "react"
import type { AdminPlace, PlaceCategory } from "@rendez/schema"
import { useDebounce } from "@uidotdev/usehooks"
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchIcon,
} from "lucide-react"
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs"
import { Link } from "react-router"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CATEGORY_META, categoryLabel } from "@/features/places/lib/category-meta"
import { DANANG_DISTRICTS } from "@/features/places/lib/danang-districts"
import { priceLevelLabel } from "@/features/places/lib/price-level"
import { formatCoordinate, formatNumber } from "@/lib/format"
import type { AdminPlaceCategoryFilter, AdminPlaceVisibilityFilter } from "../api/admin-api"
import { useAdminOverview, useAdminPlaces } from "../hooks/use-admin"
import { ADMIN_UI } from "../lib/admin-constants"
import { DistrictPlacesChart } from "./places/district-places-chart"
import { EditPlaceSheet } from "./places/edit-place-sheet"
import { AdminDataTable, type AdminColumnDef } from "./shared/admin-data-table"

const VISIBILITY_VALUES = ["all", "published", "unpublished", "closed"] as const
const CATEGORY_VALUES = [
  "all",
  "cafe",
  "restaurant",
  "street-food",
  "bakery",
  "dessert",
  "bar",
] as const

const VISIBILITY_FILTERS: { value: AdminPlaceVisibilityFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "published", label: "Hiển thị" },
  { value: "unpublished", label: "Đang ẩn" },
  { value: "closed", label: "Đóng cửa" },
]

const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value: value as PlaceCategory,
  label: meta.label,
}))

export function PlacesTab() {
  const [searchText, setSearchText] = useQueryState(
    "pQ",
    parseAsString.withDefault("").withOptions({ history: "replace" }),
  )
  const debouncedQuery = useDebounce(searchText, ADMIN_UI.DEBOUNCE_SEARCH_MS)
  const [visibility, setVisibility] = useQueryState(
    "pVis",
    parseAsStringLiteral(VISIBILITY_VALUES).withDefault("all").withOptions({ history: "replace" }),
  )
  const [district, setDistrict] = useQueryState(
    "pDistrict",
    parseAsString.withDefault("all").withOptions({ history: "replace" }),
  )
  const [category, setCategory] = useQueryState(
    "pCat",
    parseAsStringLiteral(CATEGORY_VALUES).withDefault("all").withOptions({ history: "replace" }),
  )
  const [editing, setEditing] = useState<AdminPlace | null>(null)

  const overviewQuery = useAdminOverview()
  const placesQuery = useAdminPlaces({ visibility, district, category, q: debouncedQuery })
  const places = useMemo(
    () => placesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [placesQuery.data],
  )

  const hasFilters =
    searchText.trim().length > 0 || visibility !== "all" || district !== "all" || category !== "all"

  function resetFilters() {
    void setSearchText(null)
    void setVisibility(null)
    void setDistrict(null)
    void setCategory(null)
  }

  const columns = useMemo<AdminColumnDef<AdminPlace>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Địa điểm",
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="max-w-64 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-medium text-foreground">{item.name}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6 shrink-0"
                  aria-label={`Mở ${item.name}`}
                  onClick={(event) => event.stopPropagation()}
                  render={
                    <Link to={`/discover/${item.id}`} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  <ExternalLinkIcon className="size-3" aria-hidden="true" />
                </Button>
              </div>
              <span className="block truncate text-xs text-muted-foreground">{item.address}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "category",
        header: "Danh mục",
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {categoryLabel(row.original.category)}
          </Badge>
        ),
      },
      {
        accessorKey: "district",
        header: "Quận",
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.original.district ?? "Chưa rõ"}
          </span>
        ),
      },
      {
        accessorKey: "priceLevel",
        header: "Mức giá",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {priceLevelLabel(row.original.priceLevel)}
          </Badge>
        ),
      },
      {
        id: "visibilityStatus",
        accessorFn: (row) =>
          row.publishedAt === null
            ? "unpublished"
            : row.status === "closed"
              ? "closed"
              : "published",
        header: "Trạng thái",
        cell: ({ row }) =>
          row.original.publishedAt === null ? (
            <Badge variant="outline">Đang ẩn</Badge>
          ) : row.original.status === "closed" ? (
            <Badge variant="destructive">Đóng cửa</Badge>
          ) : (
            <Badge variant="default">Hiển thị</Badge>
          ),
      },
      {
        accessorKey: "reviewCount",
        header: "Đánh giá / Báo cáo",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-xs whitespace-nowrap tabular-nums">
            <span>{formatNumber(row.original.reviewCount)} đánh giá</span>
            {row.original.reportCount > 0 ? (
              <Badge variant="destructive" className="px-1.5 py-0 text-[11px]">
                {formatNumber(row.original.reportCount)} báo cáo
              </Badge>
            ) : (
              <span className="text-muted-foreground">0 báo cáo</span>
            )}
          </div>
        ),
      },
      {
        id: "coords",
        accessorFn: (row) => (row.lat !== null && row.lng !== null ? 1 : 0),
        header: "Tọa độ",
        cell: ({ row }) =>
          row.original.lat !== null && row.original.lng !== null ? (
            <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
              {formatCoordinate(row.original.lat)}, {formatCoordinate(row.original.lng)}
            </span>
          ) : (
            <Badge variant="outline" className="border-star/50 text-[11px] text-star">
              Thiếu GPS
            </Badge>
          ),
      },
      {
        id: "actions",
        header: "Thao tác",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={(event) => {
              event.stopPropagation()
              setEditing(row.original)
            }}
          >
            <PencilIcon className="size-3.5" aria-hidden="true" />
            Sửa
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <div className="flex flex-col gap-5">
      <DistrictPlacesChart
        data={overviewQuery.data?.venuesByDistrict ?? []}
        selectedDistrict={district}
        onSelectDistrict={(next) => void setDistrict(next)}
      />

      <AdminDataTable
        columns={columns}
        data={places}
        getRowId={(row) => row.id}
        isPending={placesQuery.isPending && places.length === 0}
        isFetching={placesQuery.isFetching && placesQuery.isPlaceholderData}
        isError={placesQuery.isError}
        errorTitle="Không tải được địa điểm"
        onRetry={() => void placesQuery.refetch()}
        onRowClick={setEditing}
        enableColumnToggle
        ariaLabel="Bảng địa điểm"
        toolbarExtra={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <InputGroup>
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  value={searchText}
                  onChange={(event) => void setSearchText(event.target.value || null)}
                  placeholder="Tìm tên, địa chỉ…"
                  aria-label="Tìm địa điểm"
                />
              </InputGroup>
            </div>

            <ToggleGroup
              value={[visibility]}
              onValueChange={(next) => {
                const selected = next[0] as AdminPlaceVisibilityFilter | undefined
                if (selected) void setVisibility(selected === "all" ? null : selected)
              }}
              variant="outline"
              size="sm"
              aria-label="Lọc trạng thái"
            >
              {VISIBILITY_FILTERS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  className="min-h-9 px-3 text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-8"
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className="min-h-9 sm:min-h-8" />}
              >
                {district === "all" ? "Tất cả quận" : district}
                <ChevronDownIcon className="size-3.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={district}
                  onValueChange={(val: unknown) => {
                    if (typeof val === "string") void setDistrict(val === "all" ? null : val)
                  }}
                >
                  <DropdownMenuRadioItem value="all">Tất cả quận</DropdownMenuRadioItem>
                  {DANANG_DISTRICTS.map((item) => (
                    <DropdownMenuRadioItem key={item} value={item}>
                      {item}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className="min-h-9 sm:min-h-8" />}
              >
                {category === "all" ? "Mọi danh mục" : categoryLabel(category)}
                <ChevronDownIcon className="size-3.5" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={category}
                  onValueChange={(val: unknown) => {
                    if (typeof val === "string") {
                      void setCategory(val === "all" ? null : (val as AdminPlaceCategoryFilter))
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all">Mọi danh mục</DropdownMenuRadioItem>
                  {CATEGORY_OPTIONS.map((item) => (
                    <DropdownMenuRadioItem key={item.value} value={item.value}>
                      {item.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {hasFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs"
                onClick={resetFilters}
              >
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Đặt lại
              </Button>
            ) : null}
          </div>
        }
        emptyState={
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>Không có địa điểm phù hợp</EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Không có quán nào khớp đồng thời với bộ lọc hiện tại."
                  : "Chưa có địa điểm nào trong hệ thống."}
              </EmptyDescription>
            </EmptyHeader>
            {hasFilters ? (
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                <RotateCcwIcon className="size-3.5" aria-hidden="true" />
                Xoá bộ lọc
              </Button>
            ) : null}
          </Empty>
        }
        pagination={{
          hasNextPage: placesQuery.hasNextPage,
          isFetchingNextPage: placesQuery.isFetchingNextPage,
          onLoadMore: () => void placesQuery.fetchNextPage(),
          loadingLabel: "Đang tải thêm",
          endMessage: "Đã hiển thị hết danh sách.",
        }}
      />

      <EditPlaceSheet
        key={editing?.id ?? "none"}
        place={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
