import { useCallback, useState } from "react"
import type { PlaceMediaKind } from "@rendez/schema"
import { countBy } from "es-toolkit"
import { CameraIcon, ImageIcon, ReceiptTextIcon, UtensilsIcon } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { toast } from "sonner"
import { ImageLightbox } from "@/components/shared/image-lightbox"
import { SafeImage } from "@/components/shared/safe-image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatRelativeTime } from "@/lib/format"
import { requestMediaUpload, uploadMediaFile } from "@/lib/media-upload"
import { useAddPlaceImages, usePlaceMedia } from "../hooks/use-place-media"

interface PlaceMediaTabsProps {
  placeId: string
  placeName: string
  canUpload: boolean
}

const MAX_UPLOAD_BATCH = 3

const TAB_DEFS: Array<{ kind: PlaceMediaKind; label: string; icon: typeof ImageIcon }> = [
  { kind: "dish_real", label: "Món thật", icon: UtensilsIcon },
  { kind: "menu_price", label: "Bảng giá", icon: ReceiptTextIcon },
  { kind: "venue", label: "Không gian", icon: ImageIcon },
]

export function PlaceMediaTabs({ placeId, placeName, canUpload }: PlaceMediaTabsProps) {
  const { data: items = [], isPending } = usePlaceMedia(placeId)
  const addImages = useAddPlaceImages(placeId)
  const [activeKind, setActiveKind] = useState<PlaceMediaKind>("dish_real")
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)

  const filtered = items.filter((item) => item.kind === activeKind)
  const rawCounts = countBy(items, (item) => item.kind)
  const counts: Record<PlaceMediaKind, number> = {
    dish_real: rawCounts.dish_real ?? 0,
    menu_price: rawCounts.menu_price ?? 0,
    venue: rawCounts.venue ?? 0,
  }

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const files = acceptedFiles.slice(0, MAX_UPLOAD_BATCH)
      if (files.length === 0) return

      setUploading(true)
      try {
        const uploaded: Array<{ url: string; kind: PlaceMediaKind }> = []
        for (const file of files) {
          const ticket = await requestMediaUpload("places", file.type || "image/jpeg")
          const url = await uploadMediaFile(file, ticket)
          uploaded.push({ url, kind: activeKind })
        }
        await addImages.mutateAsync(uploaded)
        toast.success("Đã thêm ảnh đóng góp, cảm ơn bạn!")
      } catch {
        toast.error("Không tải ảnh lên được, thử lại nhé")
      } finally {
        setUploading(false)
      }
    },
    [activeKind, addImages],
  )

  const {
    getRootProps,
    getInputProps,
    open: openFilePicker,
  } = useDropzone({
    accept: { "image/*": [] },
    multiple: true,
    maxFiles: MAX_UPLOAD_BATCH,
    noClick: true,
    noKeyboard: true,
    disabled: !canUpload || uploading,
    onDrop: (files) => {
      void handleDrop(files)
    },
  })

  return (
    <section
      {...getRootProps()}
      aria-label="Thư viện ảnh và bảng giá"
      className="flex flex-col gap-3"
    >
      {canUpload ? <input {...getInputProps()} /> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold tracking-tight">Ảnh thật &amp; Bảng giá</h2>
        {canUpload ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={openFilePicker}
            className="min-h-10"
          >
            {uploading ? (
              <Spinner aria-label="Đang tải ảnh lên" />
            ) : (
              <CameraIcon className="size-4" />
            )}
            {activeKind === "menu_price" ? "Chụp bảng giá" : "Thêm ảnh thật"}
          </Button>
        ) : null}
      </div>

      <Tabs
        value={activeKind}
        onValueChange={(val) => setActiveKind(val as PlaceMediaKind)}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-3">
          {TAB_DEFS.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.kind}
                value={tab.kind}
                className="min-h-9 gap-1 px-1.5 py-1.5 text-xs sm:gap-1.5 sm:px-2.5 sm:text-sm"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {tab.label} ({counts[tab.kind]})
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {TAB_DEFS.map((tab) => (
          <TabsContent key={tab.kind} value={tab.kind} className="mt-3">
            {isPending && items.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner aria-label="Đang tải thư viện ảnh" />
              </div>
            ) : filtered.length === 0 ? (
              <Empty className="border border-dashed border-border/80 bg-muted/20 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CameraIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {tab.kind === "menu_price"
                      ? "Chưa có ảnh bảng giá tại quán"
                      : `Chưa có ${tab.label.toLowerCase()}`}
                  </EmptyTitle>
                  <EmptyDescription>
                    {tab.kind === "menu_price"
                      ? "Chụp ảnh thực đơn hoặc bảng giá giúp người đi sau biết trước mức giá."
                      : "Đóng góp ảnh chụp thật để cộng đồng xem khẩu phần thực tế."}
                  </EmptyDescription>
                </EmptyHeader>
                {canUpload ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={openFilePicker}
                    disabled={uploading}
                  >
                    <CameraIcon className="size-4" />
                    {tab.kind === "menu_price"
                      ? "Chụp bảng giá giúp người đi sau"
                      : "Đóng góp ảnh ngay"}
                  </Button>
                ) : null}
              </Empty>
            ) : (
              <div className="flex snap-x snap-proximity gap-3 overflow-x-auto pb-2">
                {filtered.map((item, idx) => (
                  <div
                    key={item.id}
                    className="group relative w-44 shrink-0 snap-start overflow-hidden rounded-surface border border-border/60 bg-card sm:w-52"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setLightboxIndex(idx)}
                      className="h-36 w-full p-0 hover:bg-transparent"
                      aria-label={`Xem phóng to ${tab.label} ${idx + 1}`}
                    >
                      <SafeImage
                        src={item.url}
                        alt={`${placeName} - ${tab.label} ${idx + 1}`}
                        className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </Button>
                    <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <span className="truncate">{item.authorName ?? "Cộng đồng"}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-xs font-normal">
                        {formatRelativeTime(item.capturedAt)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <ImageLightbox
        images={filtered.map((i) => i.url)}
        index={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        altPrefix={`${placeName} - ${TAB_DEFS.find((t) => t.kind === activeKind)?.label ?? "Ảnh"}`}
      />
    </section>
  )
}
