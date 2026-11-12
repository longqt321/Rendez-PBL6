import { useEffect, useState } from "react"
import type { PlaceCategory } from "../types/place"

/**
 * Ảnh minh hoạ theo nhóm loại hình (AI sinh, dùng chung cho mọi quán cùng nhóm).
 *
 * Manifest do `scripts/copy-cold-start-images.mjs` sinh lúc prebuild bằng cách
 * ĐỌC THƯ MỤC THẬT — thêm/bớt ảnh không phải sửa code. Nhóm chưa có ảnh thì
 * mảng rỗng, UI rơi về placeholder SVG hiện có.
 */
const MANIFEST_URL = "/data/cold-start/images/categories/manifest.json"

/**
 * 6 loại hình FE → nhóm ảnh minh hoạ.
 *
 * Suy ra từ `CATEGORY_IMAGE_GROUP` trong `scripts/copy-cold-start-images.mjs`
 * (nhóm của các nhãn corpus thuộc loại hình đó): quán ăn/ăn vặt/chè… → `quan-an`,
 * bánh mì/bánh ngọt → `banh-mi`, quán nhậu/bar → `quan-nhau`.
 */
const CATEGORY_IMAGE_GROUP: Record<PlaceCategory, string> = {
  cafe: "cafe",
  restaurant: "quan-an",
  "street-food": "quan-an",
  bakery: "banh-mi",
  dessert: "quan-an",
  bar: "quan-nhau",
}

type CategoryManifest = Record<string, string[]>

/** Manifest chỉ tải một lần cho cả phiên (mọi card dùng chung). */
let manifestPromise: Promise<CategoryManifest> | null = null

function loadManifest(): Promise<CategoryManifest> {
  manifestPromise ??= fetch(MANIFEST_URL)
    .then((response) => (response.ok ? (response.json() as Promise<CategoryManifest>) : {}))
    .catch(() => ({}))
  return manifestPromise
}

/** Tổng mã ký tự của tên quán — chọn ảnh ổn định giữa các lần render/tải lại. */
function hashName(name: string): number {
  let sum = 0
  for (let index = 0; index < name.length; index += 1) sum += name.charCodeAt(index)
  return sum
}

/**
 * Ảnh minh hoạ cho quán chưa có ảnh thật: chọn theo nhóm của category, chỉ số
 * = hash(tên quán) để quán luôn nhận cùng một ảnh. Nhóm rỗng/chưa tải xong →
 * `undefined` (caller giữ placeholder SVG hiện có).
 */
export function useCategoryImage(category: PlaceCategory, name: string): string | undefined {
  const [manifest, setManifest] = useState<CategoryManifest | null>(null)

  useEffect(() => {
    let active = true
    void loadManifest().then((value) => {
      if (active) setManifest(value)
    })
    return () => {
      active = false
    }
  }, [])

  const group = CATEGORY_IMAGE_GROUP[category]
  const files = manifest?.[group] ?? []
  if (files.length === 0) return undefined
  // Manifest lưu tên file trong thư mục nhóm (`cafe/cafe-1.jpg` trên đĩa) —
  // URL phải kèm nhóm.
  return `/data/cold-start/images/categories/${group}/${files[hashName(name) % files.length]}`
}
