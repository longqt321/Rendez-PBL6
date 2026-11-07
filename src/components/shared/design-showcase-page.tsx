import { useState } from "react"
import {
  ArrowRightIcon,
  CheckIcon,
  HeartIcon,
  PaletteIcon,
  SparklesIcon,
  StarIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { toast } from "sonner"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { SkinToggle } from "@/components/layout/skin-toggle"
import { ThemeToggle } from "@/components/layout/theme-toggle"

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

  function simulateLoading() {
    setLoading(true)
    setTimeout(() => setLoading(false), 1500)
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <PaletteIcon className="size-6" />
            Kiểm tra design stack
          </h1>
          <p className="text-sm text-muted-foreground">
            Trang tạm để xác nhận các package giao diện hoạt động. Không chứa nghiệp vụ.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SkinToggle />
          <ThemeToggle />
        </div>
      </header>

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
        <div className="grid max-w-sm gap-2">
          <Label htmlFor="demo-email">Email</Label>
          <Input id="demo-email" type="email" placeholder="ban@example.com" />
          <p className="text-xs text-muted-foreground">
            Input dùng @base-ui/react/input, đã có sẵn style focus và trạng thái lỗi.
          </p>
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
    </main>
  )
}
