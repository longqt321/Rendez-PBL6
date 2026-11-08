import { useState } from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  HeartIcon,
  InfoIcon,
  PaletteIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useSkin } from "@/app/providers/skin-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatRating } from "@/lib/format"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export function DesignShowcasePage() {
  const [loading, setLoading] = useState(false)
  const { skin, setSkin } = useSkin()

  function simulateLoading() {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <PaletteIcon className="size-6" />
            Xem trước giao diện
          </h1>
          <p className="text-sm text-muted-foreground">
            Xem toàn bộ thành phần giao diện của ứng dụng trong 2 kiểu hiển thị trước khi chọn.
          </p>
        </div>
      </header>

      <Section title="Chọn kiểu hiển thị">
        <p className="text-sm text-muted-foreground">
          Cả hai kiểu dùng chung kích thước và bố cục, chỉ khác bảng màu. Lựa chọn được lưu lại cho
          lần truy cập sau.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup
            variant="outline"
            value={[skin]}
            onValueChange={(values) => {
              const next = values.at(-1)
              if (next === "default" || next === "retro") setSkin(next)
            }}
            aria-label="Chọn kiểu hiển thị"
          >
            {(
              [
                { value: "default", label: "Mặc định" },
                { value: "retro", label: "Retro" },
              ] as const
            ).map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {skin === option.value ? <CheckIcon /> : null}
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </Section>

      <Separator />

      <Section title="Button — class-variance-authority">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Mặc định</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">
            <Trash2Icon />
            Destructive
          </Button>
          <Button variant="link">
            Link
            <ArrowRightIcon />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">xs</Button>
          <Button size="sm">sm</Button>
          <Button>default</Button>
          <Button size="lg">lg</Button>
          <Button size="icon" aria-label="Yêu thích">
            <HeartIcon />
          </Button>
          <Button disabled>
            <Spinner />
            Đang tải
          </Button>
        </div>
      </Section>

      <Section title="Badge — biến thể màu">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="outline">outline</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="ghost">ghost</Badge>
          <Badge variant="outline">
            <StarIcon />
            có icon
          </Badge>
        </div>
      </Section>

      <Section title="Card — bố cục nội dung">
        <Card>
          <CardHeader>
            <CardTitle>Tiêu đề card</CardTitle>
            <CardDescription>Mô tả ngắn cho nội dung bên dưới.</CardDescription>
            <CardAction>
              <Badge variant="secondary">
                <SparklesIcon />
                mới
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Card gồm header, content và footer. Đây là chỗ đặt nội dung chính.
          </CardContent>
          <CardFooter className="gap-2">
            <Button size="sm">Hành động</Button>
            <Button size="sm" variant="ghost">
              Bỏ qua
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Form field — input + label">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="demo-email">Email</FieldLabel>
          <Input id="demo-email" type="email" placeholder="ban@example.com" />
          <FieldDescription>
            Input dùng @base-ui/react/input, đã có sẵn style focus và trạng thái lỗi.
          </FieldDescription>
        </Field>
      </Section>

      <Section title="RadioGroup — chọn một trong nhiều">
        <RadioGroup defaultValue="comfortable" aria-label="Mật độ hiển thị" className="max-w-sm">
          <Field orientation="horizontal">
            <RadioGroupItem value="comfortable" id="density-comfortable" />
            <FieldLabel htmlFor="density-comfortable" className="flex-1">
              Thoáng
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem value="compact" id="density-compact" />
            <FieldLabel htmlFor="density-compact" className="flex-1">
              Gọn
            </FieldLabel>
          </Field>
        </RadioGroup>
      </Section>

      <Section title="Alert — banner thông tin và lỗi">
        <Alert>
          <InfoIcon />
          <AlertTitle>Dữ liệu minh hoạ</AlertTitle>
          <AlertDescription>
            Ứng dụng chưa kết nối backend, mọi nội dung đều lấy từ mock.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Không lưu được thay đổi</AlertTitle>
          <AlertDescription>Kiểm tra kết nối mạng rồi thử lại.</AlertDescription>
        </Alert>
      </Section>

      <Section title="Collapsible — nội dung ẩn">
        <Collapsible>
          <CollapsibleTrigger render={<Button variant="outline" />}>
            Xem chi tiết
            <ChevronDownIcon />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 text-sm text-muted-foreground">
            Collapsible giữ nội dung phụ gọn lại cho tới khi người dùng cần xem.
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Token bo góc và màu sao">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid size-16 place-items-center rounded-surface border border-border bg-muted text-xs text-muted-foreground">
            surface
          </div>
          <div className="grid size-16 place-items-center rounded-control border border-border bg-muted text-xs text-muted-foreground">
            control
          </div>
          <div className="grid size-16 place-items-center rounded-thumb border border-border bg-muted text-xs text-muted-foreground">
            thumb
          </div>
        </div>
        <div className="flex items-center gap-1 text-star">
          <StarIcon className="size-4 fill-star" aria-hidden="true" />
          <span className="text-sm font-medium">{formatRating(4.5)}</span>
        </div>
      </Section>

      <Section title="Dialog — @base-ui/react/dialog">
        <Dialog>
          <DialogTrigger render={<Button variant="outline">Mở dialog</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hành động</DialogTitle>
              <DialogDescription>
                Dialog tự xử lý focus trap, đóng bằng phím Esc và click ra ngoài.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost">Hủy</Button>} />
              <Button onClick={() => toast.success("Đã xác nhận")}>Xác nhận</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Toast — sonner">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.success("Lưu thành công")}>
            <CheckIcon />
            success
          </Button>
          <Button variant="outline" onClick={() => toast.error("Có lỗi xảy ra")}>
            <TriangleAlertIcon />
            error
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(new Promise((r) => setTimeout(r, 1500)), {
                loading: "Đang xử lý…",
                success: "Xong",
                error: "Thất bại",
              })
            }
          >
            promise
          </Button>
        </div>
      </Section>

      <Section title="Skeleton + animation — tw-animate-css">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={simulateLoading} disabled={loading}>
            {loading ? <Spinner /> : null}
            Mô phỏng tải
          </Button>
          <div className="flex flex-1 flex-col gap-2">
            {loading ? (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bấm nút để thấy Skeleton và hiệu ứng animate-in.
              </p>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
