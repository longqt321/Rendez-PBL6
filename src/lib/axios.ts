import axios from "axios"
import { mockAdapter } from "@/mocks/server"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // TODO: xoá dòng này khi backend thật sẵn sàng, cùng với thư mục `src/mocks/`.
  // Server giả lập trả response theo đúng hợp đồng API để frontend không phải sửa.
  adapter: mockAdapter,
})
