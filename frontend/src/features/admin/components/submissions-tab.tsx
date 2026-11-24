import { useState } from "react"
import { CheckIcon, EyeIcon, StoreIcon, XIcon } from "lucide-react"
import type { PlaceSubmission } from "@rendez/schema"
import { formatRelativeTime } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { categoryLabel } from "@/features/places/lib/category-meta"
import { useAdminSubmissions, useReviewAdminSubmission } from "../hooks/use-admin-submissions"

export function SubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "reviewed" | "dismissed">("pending")
  const [selectedSubmission, setSelectedSubmission] = useState<PlaceSubmission | null>(null)
  const [reviewNote, setReviewNote] = useState("")

  const { data: items = [], isPending } = useAdminSubmissions(statusFilter)
  const reviewMutation = useReviewAdminSubmission()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Đề xuất địa điểm từ cộng đồng</h2>
          <p className="text-xs text-muted-foreground">
            Duyệt các quán ăn, quán cà phê do người dùng gửi lên để bổ sung vào hệ thống.
          </p>
        </div>

        <ToggleGroup
          value={[statusFilter]}
          onValueChange={(val) => {
            const next = val[0] as "pending" | "reviewed" | "dismissed" | undefined
            if (next) setStatusFilter(next)
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem
            value="pending"
            className="text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            Chờ duyệt
          </ToggleGroupItem>
          <ToggleGroupItem
            value="reviewed"
            className="text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            Đã duyệt
          </ToggleGroupItem>
          <ToggleGroupItem
            value="dismissed"
            className="text-xs aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            Đã từ chối
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {isPending ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Spinner aria-label="Đang tải danh sách đề xuất" /> Đang tải đề xuất…
        </div>
      ) : items.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <StoreIcon />
            </EmptyMedia>
            <EmptyTitle>Không có đề xuất nào</EmptyTitle>
            <EmptyDescription>
              {statusFilter === "pending"
                ? "Hiện không có địa điểm nào đang chờ duyệt."
                : "Không có đề xuất nào trong danh sách này."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-surface border border-border bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Tên địa điểm</TableHead>
                <TableHead>Địa chỉ & Quận</TableHead>
                <TableHead>Loại hình</TableHead>
                <TableHead>Người đề xuất</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-semibold text-foreground">{sub.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.address}
                    {sub.district ? ` · ${sub.district}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categoryLabel(sub.category)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {sub.submitterName ?? sub.submitterId.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeTime(sub.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <EyeIcon className="size-3" />
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedSubmission ? (
        <Dialog
          open={Boolean(selectedSubmission)}
          onOpenChange={(open) => !open && setSelectedSubmission(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedSubmission.name}</DialogTitle>
              <DialogDescription>
                Đề xuất bởi{" "}
                {selectedSubmission.submitterName ?? selectedSubmission.submitterId.slice(0, 8)} lúc{" "}
                {formatRelativeTime(selectedSubmission.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-foreground">Địa chỉ:</span>{" "}
                <span className="text-muted-foreground">
                  {selectedSubmission.address},{" "}
                  {selectedSubmission.district ?? selectedSubmission.city}
                </span>
              </div>
              <div>
                <span className="font-semibold text-foreground">Loại hình:</span>{" "}
                <Badge variant="secondary">{categoryLabel(selectedSubmission.category)}</Badge>
              </div>
              {selectedSubmission.openingHours ? (
                <div>
                  <span className="font-semibold text-foreground">Giờ mở cửa:</span>{" "}
                  <span className="text-muted-foreground">{selectedSubmission.openingHours}</span>
                </div>
              ) : null}
              {selectedSubmission.phone ? (
                <div>
                  <span className="font-semibold text-foreground">Điện thoại:</span>{" "}
                  <span className="text-muted-foreground">{selectedSubmission.phone}</span>
                </div>
              ) : null}
              {selectedSubmission.description ? (
                <div>
                  <span className="font-semibold text-foreground">Mô tả:</span>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">
                    {selectedSubmission.description}
                  </p>
                </div>
              ) : null}

              {selectedSubmission.imageUrls.length > 0 ? (
                <div>
                  <span className="font-semibold text-foreground">Ảnh:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {selectedSubmission.imageUrls.map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Ảnh đề xuất"
                        className="size-16 rounded-control border border-border object-cover"
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedSubmission.status === "pending" ? (
                <Field className="pt-2">
                  <FieldLabel htmlFor="sub-note">
                    Lưu ý / Phản hồi (tuỳ chọn khi từ chối):
                  </FieldLabel>
                  <Textarea
                    id="sub-note"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Lý do từ chối hoặc ghi chú..."
                    rows={2}
                    className="text-xs"
                  />
                </Field>
              ) : null}
            </div>

            <DialogFooter className="pt-2">
              {selectedSubmission.status === "pending" ? (
                <>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate(
                        {
                          id: selectedSubmission.id,
                          status: "dismissed",
                          reviewNote: reviewNote.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            setSelectedSubmission(null)
                            setReviewNote("")
                          },
                        },
                      )
                    }
                  >
                    <XIcon className="size-3.5" />
                    Từ chối
                  </Button>
                  <Button
                    disabled={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate(
                        {
                          id: selectedSubmission.id,
                          status: "reviewed",
                          reviewNote: reviewNote.trim() || undefined,
                        },
                        {
                          onSuccess: () => {
                            setSelectedSubmission(null)
                            setReviewNote("")
                          },
                        },
                      )
                    }
                  >
                    {reviewMutation.isPending ? (
                      <Spinner aria-label="Đang xử lý" />
                    ) : (
                      <CheckIcon className="size-3.5" />
                    )}
                    Phê duyệt & Đăng quán
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                  Đóng
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  )
}
