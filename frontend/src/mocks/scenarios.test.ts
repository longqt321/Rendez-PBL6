import { describe, expect, it } from "vitest"
import { resolveScenario } from "./scenarios"

describe("resolveScenario", () => {
  it("ok: mọi cờ false, không trễ", () => {
    expect(resolveScenario("ok")).toEqual({
      delayMs: 0,
      emptyLists: false,
      serverError: false,
      unauthorized: false,
      offline: false,
    })
  })

  it("slow: chỉ trễ thêm response", () => {
    const scenario = resolveScenario("slow")
    expect(scenario.delayMs).toBeGreaterThan(0)
    expect(scenario.emptyLists).toBe(false)
    expect(scenario.serverError).toBe(false)
    expect(scenario.unauthorized).toBe(false)
    expect(scenario.offline).toBe(false)
  })

  it("empty: GET danh sách rỗng", () => {
    const scenario = resolveScenario("empty")
    expect(scenario.emptyLists).toBe(true)
    expect(scenario.delayMs).toBe(0)
    expect(scenario.serverError).toBe(false)
    expect(scenario.unauthorized).toBe(false)
    expect(scenario.offline).toBe(false)
  })

  it("server-error: GET trả 500", () => {
    const scenario = resolveScenario("server-error")
    expect(scenario.serverError).toBe(true)
    expect(scenario.delayMs).toBe(0)
    expect(scenario.emptyLists).toBe(false)
    expect(scenario.unauthorized).toBe(false)
    expect(scenario.offline).toBe(false)
  })

  it("unauthorized: GET /me trả 401", () => {
    const scenario = resolveScenario("unauthorized")
    expect(scenario.unauthorized).toBe(true)
    expect(scenario.delayMs).toBe(0)
    expect(scenario.emptyLists).toBe(false)
    expect(scenario.serverError).toBe(false)
    expect(scenario.offline).toBe(false)
  })

  it("offline: mọi request lỗi mạng", () => {
    const scenario = resolveScenario("offline")
    expect(scenario.offline).toBe(true)
    expect(scenario.delayMs).toBe(0)
    expect(scenario.emptyLists).toBe(false)
    expect(scenario.serverError).toBe(false)
    expect(scenario.unauthorized).toBe(false)
  })

  it("giá trị lạ rơi về ok thay vì crash", () => {
    expect(resolveScenario("không-tồn-tại")).toEqual(resolveScenario("ok"))
  })
})
