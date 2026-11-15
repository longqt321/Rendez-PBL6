import { Link } from "react-router"
import { StaticPage, StaticSection } from "../components/static-page"

export function HelpPage() {
  return (
    <StaticPage
      title="Trợ giúp"
      description="Câu hỏi thường gặp về cách dùng Rendez. Không tìm thấy câu trả lời? Thử khám phá thêm ở các trang dưới đây."
    >
      <StaticSection title="Làm sao tìm một quán cụ thể?">
        <p>
          Gõ tên quán (không cần dấu) vào ô tìm kiếm trên cùng, hoặc mở trang{" "}
          <Link to="/discover" className="underline underline-offset-2">
            Khám phá
          </Link>{" "}
          để lọc theo loại hình và quận. Kết quả tìm kiếm chia ba tab: Địa điểm, Bài đăng và Người.
        </p>
      </StaticSection>

      <StaticSection title="Lưu quán yêu thích ở đâu?">
        <p>
          Mở trang quán rồi bấm “Lưu” để thêm vào danh sách{" "}
          <Link to="/saved" className="underline underline-offset-2">
            Đã lưu
          </Link>
          . Muốn gom theo chủ đề (ví dụ “Làm việc”, “Hẹn hò”), tạo bộ sưu tập và lưu quán vào đó.
        </p>
      </StaticSection>

      <StaticSection title="Phòng lọc nhóm dùng thế nào?">
        <p>
          Khi đi ăn theo nhóm, tạo một phòng lọc nhóm rồi chia mã phòng cho bạn bè. Mọi người cùng
          bỏ phiếu theo sở thích, hệ thống gộp lại và gợi ý quán vừa ý cả nhóm. Khách không cần tài
          khoản vẫn vào được phòng bằng mã.
        </p>
      </StaticSection>

      <StaticSection title="Thông tin quán sai (giờ mở cửa, giá…)?">
        <p>
          Ở trang quán, dùng mục báo cáo thông tin để gửi lại giờ mở cửa, mức giá hoặc thẻ phân loại
          đúng. Đóng góp sẽ được kiểm duyệt trước khi hiện cho mọi người.
        </p>
      </StaticSection>

      <StaticSection title="Tài khoản và ảnh đại diện">
        <p>
          Vào{" "}
          <Link to="/settings" className="underline underline-offset-2">
            Cài đặt
          </Link>{" "}
          để đổi tên, giới thiệu, ảnh đại diện/ảnh bìa hoặc xoá tài khoản. Quên mật khẩu dùng link
          “Quên mật khẩu” ở trang đăng nhập.
        </p>
      </StaticSection>
    </StaticPage>
  )
}
