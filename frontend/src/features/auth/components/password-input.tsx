import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

/**
 * Ô nhập mật khẩu kèm nút hiện/ẩn dùng `InputGroup` có sẵn trong `components/ui`.
 *
 * Nút bấm đổi `type` của input giữa `password`/`text`. Icon con mắt không nền,
 * hoà vào viền ô nhập (chuẩn phổ biến của ô mật khẩu); `aria-label` + `aria-pressed`
 * để trình đọc màn hình biết trạng thái.
 */
export function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false)

  return (
    <InputGroup className={className}>
      <InputGroupInput type={visible ? "text" : "password"} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          variant="ghost"
          size="icon-sm"
          className="bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:size-4"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
