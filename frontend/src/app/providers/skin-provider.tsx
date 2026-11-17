import { useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { SkinContext, type Skin } from "./skin-context"

const STORAGE_KEY = "skin"

function readStoredSkin(): Skin {
  if (typeof window === "undefined") return "default"
  return window.localStorage.getItem(STORAGE_KEY) === "retro" ? "retro" : "default"
}

export function SkinProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [skin, setSkin] = useState<Skin>(readStoredSkin)

  // useLayoutEffect chạy trước khi trình duyệt vẽ khung hình đầu tiên,
  // nên không thấy nháy skin mặc định khi tải lại trang.
  useLayoutEffect(() => {
    const root = document.documentElement
    if (skin === "retro") {
      root.dataset.skin = "retro"
    } else {
      delete root.dataset.skin
    }
    window.localStorage.setItem(STORAGE_KEY, skin)
  }, [skin])

  const value = useMemo(() => ({ skin, setSkin }), [skin])

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}
