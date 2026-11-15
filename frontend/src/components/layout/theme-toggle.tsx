import { CheckIcon, ChevronDownIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" aria-label="Chọn chế độ sáng/tối">
            {resolvedTheme === "dark" ? <MoonIcon /> : <SunIcon />}
            {resolvedTheme === "dark" ? "Tối" : "Sáng"}
            <ChevronDownIcon />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem closeOnClick={false} onClick={() => setTheme("light")}>
          <SunIcon />
          Sáng
          {resolvedTheme === "light" ? <CheckIcon className="ml-auto" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick={false} onClick={() => setTheme("dark")}>
          <MoonIcon />
          Tối
          {resolvedTheme === "dark" ? <CheckIcon className="ml-auto" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
