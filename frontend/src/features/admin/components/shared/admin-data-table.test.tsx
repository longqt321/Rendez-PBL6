import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "@/components/ui/button"
import { AdminDataTable, type AdminColumnDef } from "./admin-data-table"

interface SampleRow {
  id: string
  name: string
  category: string
}

const COLUMNS: AdminColumnDef<SampleRow>[] = [
  { accessorKey: "name", header: "Tên quán" },
  { accessorKey: "category", header: "Danh mục" },
]

describe("AdminDataTable", () => {
  it("giữ nguyên toolbar tìm kiếm và lọc khi danh sách kết quả rỗng", () => {
    const onReset = vi.fn()
    render(
      <AdminDataTable
        columns={COLUMNS}
        data={[]}
        enableColumnToggle
        toolbarExtra={
          <div>
            <input aria-label="Tìm địa điểm" defaultValue="bar" />
            <Button type="button" onClick={onReset}>
              Đặt lại
            </Button>
          </div>
        }
        emptyState={<div>Không có địa điểm phù hợp</div>}
      />,
    )

    expect(screen.getByLabelText("Tìm địa điểm")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Đặt lại" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cột hiển thị" })).toBeInTheDocument()
    expect(screen.getByText("Không có địa điểm phù hợp")).toBeInTheDocument()
  })

  it("giữ nguyên toolbar tìm kiếm khi đang tải lần đầu (isPending)", () => {
    render(
      <AdminDataTable
        columns={COLUMNS}
        data={[]}
        isPending
        toolbarExtra={<input aria-label="Tìm kiếm" />}
      />,
    )

    expect(screen.getByLabelText("Tìm kiếm")).toBeInTheDocument()
  })

  it("giữ nguyên dữ liệu cũ và chỉ làm mờ nhẹ khi đang lọc lại (isFetching)", () => {
    render(
      <AdminDataTable
        columns={COLUMNS}
        data={[{ id: "1", name: "Cà phê Biển", category: "cafe" }]}
        isFetching
        ariaLabel="Bảng kiểm thử"
        toolbarExtra={<input aria-label="Tìm kiếm" />}
      />,
    )

    expect(screen.getByText("Cà phê Biển")).toBeInTheDocument()
    expect(
      screen.getByRole("table", { name: "Bảng kiểm thử" }).closest("[aria-busy='true']"),
    ).toBeTruthy()
  })

  it("mở menu Cột hiển thị không gây lỗi Base UI MenuGroupContext và ẩn/hiện được cột", async () => {
    const user = userEvent.setup()
    render(
      <AdminDataTable
        columns={COLUMNS}
        data={[{ id: "1", name: "Cà phê Biển", category: "cafe" }]}
        enableColumnToggle
      />,
    )

    await user.click(screen.getByRole("button", { name: "Cột hiển thị" }))
    expect(await screen.findByText("Chọn cột hiển thị")).toBeInTheDocument()
    const catOption = await screen.findByRole("menuitemcheckbox", { name: "Danh mục" })
    await user.click(catOption)
    expect(screen.queryByText("cafe")).not.toBeInTheDocument()
  })
})
