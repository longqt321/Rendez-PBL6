import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"
import { ResponsiveModal } from "@/components/shared/responsive-modal"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useUpdatePost } from "../hooks/use-update-post"
import type { Post } from "../types/post"

const editCaptionSchema = z.object({
  caption: z.string().trim().min(1, "Nội dung không được để trống").max(2000, "Tối đa 2000 ký tự"),
})

type EditCaptionValues = z.infer<typeof editCaptionSchema>

interface EditPostDialogProps {
  readonly post: Post
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function EditPostDialog({ post, open, onOpenChange }: EditPostDialogProps) {
  const updatePost = useUpdatePost()
  const form = useForm<EditCaptionValues>({
    resolver: zodResolver(editCaptionSchema),
    defaultValues: { caption: post.caption },
  })

  useEffect(() => {
    if (open) {
      form.reset({ caption: post.caption })
    }
  }, [open, post.caption, form])

  function onSubmit(values: EditCaptionValues) {
    updatePost.mutate(
      { postId: post.id, input: { caption: values.caption } },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật bài viết")
          onOpenChange(false)
        },
        onError: () => toast.error("Không cập nhật được bài viết, thử lại nhé"),
      },
    )
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Chỉnh sửa bài viết"
      description="Cập nhật nội dung chia sẻ của bạn"
    >
      <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="flex flex-col gap-4">
        <Field data-invalid={Boolean(form.formState.errors.caption)}>
          <FieldLabel htmlFor={`edit-post-caption-${post.id}`}>Nội dung</FieldLabel>
          <Textarea
            id={`edit-post-caption-${post.id}`}
            rows={5}
            aria-invalid={Boolean(form.formState.errors.caption)}
            aria-describedby={
              form.formState.errors.caption ? `edit-post-caption-error-${post.id}` : undefined
            }
            {...form.register("caption")}
          />
          <FieldError
            id={`edit-post-caption-error-${post.id}`}
            errors={[form.formState.errors.caption]}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="submit" disabled={updatePost.isPending}>
            {updatePost.isPending ? <Spinner aria-label="Đang lưu bài viết" /> : null}
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  )
}
