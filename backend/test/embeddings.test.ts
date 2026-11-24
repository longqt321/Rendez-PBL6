import { describe, expect, test } from "bun:test"
import { embedQuery, normalizeEmbeddingCacheKey, vectorToLiteral } from "../src/lib/embeddings"
import { passageText } from "../scripts/embed-places"

describe("embeddings cache key & passageText", () => {
  test("normalizeEmbeddingCacheKey chuẩn hóa khoảng trắng, chữ hoa và NFC nhưng giữ dấu tiếng Việt", () => {
    expect(normalizeEmbeddingCacheKey("  Cà   Phê  ")).toBe("cà phê")
    expect(normalizeEmbeddingCacheKey("cà phê")).toBe("cà phê")
    // NFD decomposed -> NFC composed khớp y hệt
    expect(normalizeEmbeddingCacheKey("Ca\u0300 Ph\u00EA")).toBe(
      normalizeEmbeddingCacheKey("cà phê"),
    )
    // Giữ nguyên ngữ nghĩa khác biệt theo dấu cho mô hình e5
    expect(normalizeEmbeddingCacheKey("cơm chay")).not.toBe(normalizeEmbeddingCacheKey("cơm cháy"))
    expect(normalizeEmbeddingCacheKey("   \t\n  ")).toBe("")
  })

  test("embedQuery trả về null an toàn khi chuỗi sau chuẩn hóa rỗng", async () => {
    expect(await embedQuery("   \n\t ")).toBeNull()
  })

  test("vectorToLiteral định dạng chuẩn literal cho pgvector", () => {
    expect(vectorToLiteral(new Float32Array([0.5, -0.25, 1]))).toBe("[0.5,-0.25,1]")
  })

  test("passageText chèn nhãn tiếng Việt và description sạch, xử lý cả enum Prisma", () => {
    const out = passageText({
      id: "banh-xeo-ba-duong",
      name: "  Bánh xèo Bà Dưỡng  ",
      category: "street_food",
      district: "Hải Châu",
      tags: ["bánh xèo", "nem lụi"],
      description: "  Quán trong hẻm nhỏ,   vỏ giòn rụm và nước mắm đậu phộng  ",
    })

    expect(out).toBe(
      "Bánh xèo Bà Dưỡng Ăn vặt street_food Hải Châu bánh xèo nem lụi Quán trong hẻm nhỏ, vỏ giòn rụm và nước mắm đậu phộng",
    )
  })

  test("passageText bỏ qua trường rỗng khi thiếu description hoặc tags", () => {
    const out = passageText({
      id: "cafe-abc",
      name: "ABC Coffee",
      category: "cafe",
      district: null,
      description: "   ",
      tags: null,
    })

    expect(out).toBe("ABC Coffee Cà phê cafe")
  })
})
