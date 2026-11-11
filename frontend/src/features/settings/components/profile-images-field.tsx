import { useRef, useState } from "react"
import { ImagePlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { CoverImage } from "@/components/shared/cover-image"
import { IMAGE_CONTENT_TYPES } from "@/lib/constants"
import { isMediaUnavailableError, requestMediaUpload, uploadMediaFile } from "@/lib/media-upload"
import { useUpdateMe } from "@/features/profile/hooks/use-update-me"
import type { UserProfile } from "@/features/profile/types/profile"

/**
 * Tải ảnh đại diện + ảnh bìa hồ sơ (T7.1).
 *
 * Chọn file → xin URL PUT đã ký (`POST /media`, thư mục `avatars`/`covers`) →
 * PUT thẳng lên R2 → `PATCH /me` ghi URL mới. Lưu ngay khi chọn ảnh (không đợi
 * bấm "Lưu thay đổi") vì form chỉ quản lý trường chữ — ảnh là URL do media
 * service cấp, lưu trễ sẽ phải giữ file trong state qua các lần submit.
 *
 * R2 chưa cấu hình (503): tắt cả hai nút và giữ placeholder — cùng suy giảm
 * nhẹ nhàng với nút upload ảnh của composer.
 */

type ImageKind = "avatar" | "cover"

const FOLDER_BY_KIND = { avatar: "avatars", cover: "covers" } as const
const LABEL_BY_KIND: Record<ImageKind, string> = {
  avatar: "ảnh đại diện",
  cover: "ảnh bìa",
}

export function ProfileImagesField({ profile }: { profile: UserProfile }) {
  const updateMe = useUpdateMe()
  const [mediaUnavailable, setMediaUnavailable] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<ImageKind | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(kind: ImageKind, file: File | undefined) {
    if (!file) return
    if (!(IMAGE_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF")
      return
    }

    setUploadingKind(kind)
    try {
      const ticket = await requestMediaUpload(FOLDER_BY_KIND[kind], file.type)
      const url = await uploadMediaFile(file, ticket)
      await updateMe.mutateAsync({
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        privateProfile: profile.privateProfile,
        [kind === "avatar" ? "avatarUrl" : "coverUrl"]: url,
      })
      toast.success(`Đã cập nhật ${LABEL_BY_KIND[kind]}.`)
    } catch (error) {
      if (isMediaUnavailableError(error)) {
        setMediaUnavailable(true)
        toast.error("Tính năng ảnh chưa được cấu hình")
      } else {
        toast.error(error instanceof Error ? error.message : "Không tải được ảnh. Thử lại nhé.")
      }
    } finally {
      setUploadingKind(null)
    }
  }

  async function handleRemove(kind: ImageKind) {
    try {
      await updateMe.mutateAsync({
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        privateProfile: profile.privateProfile,
        [kind === "avatar" ? "avatarUrl" : "coverUrl"]: null,
      })
      toast.success(`Đã xoá ${LABEL_BY_KIND[kind]}.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xoá được ảnh. Thử lại nhé.")
    }
  }

  const disabled = mediaUnavailable || updateMe.isPending
  const avatarUrl = profile.avatarUrl ?? undefined
  const coverUrl = profile.coverUrl ?? undefined

  return (
    <FieldSet>
      <FieldLegend>Ảnh hồ sơ</FieldLegend>
      <FieldDescription>
        Ảnh JPEG, PNG, WebP hoặc AVIF. Ảnh được tải lên ngay khi chọn, không cần bấm "Lưu thay đổi".
      </FieldDescription>

      <div className="flex flex-col gap-4">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel>Ảnh đại diện</FieldLabel>
            <Avatar className="size-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt="Ảnh đại diện của bạn" />}
              <AvatarFallback className="bg-accent font-bold text-accent-foreground">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
          </FieldContent>
          <div className="flex items-center gap-2">
            <input
              ref={avatarInputRef}
              type="file"
              accept={IMAGE_CONTENT_TYPES.join(",")}
              className="sr-only"
              aria-label="Chọn ảnh đại diện"
              onChange={(event) => {
                void handleFile("avatar", event.target.files?.[0])
                event.target.value = "" // chọn lại cùng file vẫn kích hoạt onChange
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => avatarInputRef.current?.click()}
            >
              {uploadingKind === "avatar" ? <Spinner className="size-4" /> : <ImagePlusIcon />}
              Đổi ảnh
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() => void handleRemove("avatar")}
              >
                <Trash2Icon /> Xoá
              </Button>
            )}
          </div>
        </Field>

        <Field>
          <FieldLabel>Ảnh bìa</FieldLabel>
          <CoverImage
            src={coverUrl}
            height={120}
            className="w-full rounded-md border border-border"
            alt="Ảnh bìa của bạn"
          />
          <div className="flex items-center gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept={IMAGE_CONTENT_TYPES.join(",")}
              className="sr-only"
              aria-label="Chọn ảnh bìa"
              onChange={(event) => {
                void handleFile("cover", event.target.files?.[0])
                event.target.value = "" // chọn lại cùng file vẫn kích hoạt onChange
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => coverInputRef.current?.click()}
            >
              {uploadingKind === "cover" ? <Spinner className="size-4" /> : <ImagePlusIcon />}
              Đổi ảnh bìa
            </Button>
            {coverUrl && (
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                onClick={() => void handleRemove("cover")}
              >
                <Trash2Icon /> Xoá
              </Button>
            )}
          </div>
        </Field>
      </div>
    </FieldSet>
  )
}
