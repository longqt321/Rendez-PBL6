import { useState } from "react"
import { ImagePlusIcon, Trash2Icon } from "lucide-react"
import { useDropzone } from "react-dropzone"
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

type ImageKind = "avatar" | "cover"

const FOLDER_BY_KIND = { avatar: "avatars", cover: "covers" } as const
const LABEL_BY_KIND: Record<ImageKind, string> = {
  avatar: "ảnh đại diện",
  cover: "ảnh bìa",
}

const ACCEPTED_IMAGE_TYPES = Object.fromEntries(
  IMAGE_CONTENT_TYPES.map((type) => [type, [] as string[]]),
)

export function ProfileImagesField({ profile }: Readonly<{ profile: UserProfile }>) {
  const updateMe = useUpdateMe()
  const [mediaUnavailable, setMediaUnavailable] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<ImageKind | null>(null)

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

  const avatarDropzone = useDropzone({
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    noClick: true,
    noDrag: true,
    disabled,
    onDropAccepted: (files) => void handleFile("avatar", files[0]),
    onDropRejected: () => toast.error("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF"),
  })

  const coverDropzone = useDropzone({
    accept: ACCEPTED_IMAGE_TYPES,
    multiple: false,
    noClick: true,
    noDrag: true,
    disabled,
    onDropAccepted: (files) => void handleFile("cover", files[0]),
    onDropRejected: () => toast.error("Chỉ nhận ảnh JPEG, PNG, WebP hoặc AVIF"),
  })

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
              {...avatarDropzone.getInputProps({
                className: "sr-only",
                "aria-label": "Chọn ảnh đại diện",
              })}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={avatarDropzone.open}
            >
              {uploadingKind === "avatar" ? (
                <Spinner className="size-4" aria-label="Đang tải ảnh đại diện" />
              ) : (
                <ImagePlusIcon />
              )}
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
              {...coverDropzone.getInputProps({
                className: "sr-only",
                "aria-label": "Chọn ảnh bìa",
              })}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={coverDropzone.open}
            >
              {uploadingKind === "cover" ? (
                <Spinner className="size-4" aria-label="Đang tải ảnh bìa" />
              ) : (
                <ImagePlusIcon />
              )}
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
