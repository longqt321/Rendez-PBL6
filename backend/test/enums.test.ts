import { describe, expect, test } from "bun:test"
import {
  toApiCategory,
  toApiNotificationType,
  toApiProposalField,
  toApiReportReason,
  toPrismaCategory,
  toPrismaNotificationType,
  toPrismaProposalField,
  toPrismaReportReason,
} from "../src/lib/enums"

/**
 * Quy đổi enum API ↔ Prisma là nguồn lỗi im lặng trước đây (`as never`), nên
 * kiểm trực tiếp: round-trip phải giữ nguyên giá trị, và giá trị lạ phải ném lỗi
 * thay vì lọt xuống DB.
 */
describe("quy đổi enum", () => {
  test("category: round-trip mọi giá trị", () => {
    for (const api of ["cafe", "restaurant", "street-food", "bakery", "dessert", "bar"] as const) {
      expect(toApiCategory(toPrismaCategory(api))).toBe(api)
    }
    expect(toPrismaCategory("street-food")).toBe("street_food")
  })

  test("category: giá trị lạ ném lỗi", () => {
    expect(() => toApiCategory("khong_ton_tai")).toThrow()
  })

  test("report reason: round-trip mọi giá trị", () => {
    for (const api of ["closed", "wrong-info", "duplicate", "other"] as const) {
      expect(toApiReportReason(toPrismaReportReason(api))).toBe(api)
    }
    expect(toPrismaReportReason("wrong-info")).toBe("wrong_info")
  })

  test("notification type: DB lưu gạch nối cho place-suggestion", () => {
    expect(toPrismaNotificationType("place-suggestion")).toBe("place_suggestion")
    expect(toApiNotificationType("place-suggestion")).toBe("place-suggestion")
    expect(toApiNotificationType("place_suggestion")).toBe("place-suggestion")
    expect(toApiNotificationType("like")).toBe("like")
    expect(() => toApiNotificationType("khong-ro")).toThrow()
  })

  test("proposal field: priceMax ↔ price_max", () => {
    expect(toPrismaProposalField("priceMax")).toBe("price_max")
    expect(toApiProposalField("price_max")).toBe("priceMax")
    expect(toApiProposalField("category")).toBe("category")
  })
})
