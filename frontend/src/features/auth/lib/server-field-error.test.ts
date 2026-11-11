import { describe, expect, test } from "vitest"

import { serverErrorField } from "./server-field-error"

const REGISTER_FIELDS = ["name", "email", "handle", "password"] as const
const LOGIN_FIELDS = ["email", "password"] as const

describe("serverErrorField", () => {
  test("gắn lỗi trùng email về field email", () => {
    expect(serverErrorField("Email đã được sử dụng", REGISTER_FIELDS)).toBe("email")
  })

  test("gắn lỗi trùng handle về field handle", () => {
    expect(serverErrorField("Handle đã được sử dụng", REGISTER_FIELDS)).toBe("handle")
  })

  test("message nhắc nhiều field thì trả undefined để hiện lỗi chung", () => {
    expect(serverErrorField("Email hoặc mật khẩu không đúng", LOGIN_FIELDS)).toBeUndefined()
  })

  test("message không nhắc field nào thì trả undefined", () => {
    expect(serverErrorField("Dữ liệu đăng ký không hợp lệ", REGISTER_FIELDS)).toBeUndefined()
    expect(
      serverErrorField("Không kết nối được máy chủ — kiểm tra mạng rồi thử lại.", REGISTER_FIELDS),
    ).toBeUndefined()
  })

  test("chỉ trả field có trong danh sách của form gọi hàm", () => {
    // Handle không có trong form đăng nhập → không gắn nhầm field nào.
    expect(serverErrorField("Handle đã được sử dụng", LOGIN_FIELDS)).toBeUndefined()
  })

  test("nhận diện lỗi mật khẩu và tên hiển thị", () => {
    expect(serverErrorField("Mật khẩu cần ít nhất 8 ký tự", REGISTER_FIELDS)).toBe("password")
    expect(serverErrorField("Tên cần ít nhất 2 ký tự", REGISTER_FIELDS)).toBe("name")
  })
})
