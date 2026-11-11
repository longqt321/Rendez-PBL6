import { useState } from "react"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

/**
 * Ô nhập mật khẩu kèm nút hiện/ẩn dùng `InputGroup` có sẵn trong `components/ui`.
 *
 * Nút bấm đổi `type` của input giữa `password`/`text`. Dùng chữ "Hiện"/"Ẩn" thay
 * cho icon con mắt: rõ nghĩa hơn với người dùng phổ thông và không phụ thuộc vào
 * nét vẽ icon. `aria-label` + `aria-pressed` giữ nguyên để trình đọc màn hình
 * đọc đúng trạng thái.
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
          size="sm"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          {visible ? "Ẩn" : "Hiện"}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
