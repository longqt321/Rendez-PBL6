import { Link } from "react-router"
import { StaticPage, StaticSection } from "../components/static-page"

export function TermsPage() {
  return (
    <StaticPage
      title="Điều khoản sử dụng"
      description="Quy định khi tạo tài khoản và sử dụng dịch vụ Rendez. Cập nhật lần cuối: 12/11/2026."
    >
      <StaticSection title="1. Tài khoản">
        <p>
          Bạn cần đăng ký bằng email hợp lệ và xác thực email để đăng nhập. Bạn chịu trách nhiệm giữ
          mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình. Mỗi người dùng một tài khoản
          chính danh; không mạo danh người khác.
        </p>
      </StaticSection>

      <StaticSection title="2. Nội dung bạn đăng">
        <p>
          Bài đăng, bình luận, đánh giá và ảnh bạn tải lên phải là nội dung bạn có quyền chia sẻ và
          không vi phạm pháp luật. Nghiêm cấm nội dung xúc phạm, quấy rối, spam, quảng cáo trái phép
          hoặc thông tin sai lệch về địa điểm.
        </p>
        <p>
          Bạn giữ quyền với nội dung của mình; bằng việc đăng lên Rendez, bạn cho phép Rendez hiển
          thị nội dung đó trong ứng dụng. Chúng tôi có thể ẩn hoặc xoá nội dung vi phạm.
        </p>
      </StaticSection>

      <StaticSection title="3. Thông tin địa điểm">
        <p>
          Dữ liệu quán (giờ mở cửa, giá, địa chỉ) do cộng đồng đóng góp và có thể thay đổi. Rendez
          không bảo đảm thông tin luôn chính xác tại thời điểm bạn tới quán; hãy kiểm tra lại với
          quán khi cần.
        </p>
      </StaticSection>

      <StaticSection title="4. Xử lý vi phạm">
        <p>
          Tài khoản vi phạm có thể bị hạn chế hoặc xoá. Bạn có thể tự xoá tài khoản bất cứ lúc nào
          trong{" "}
          <Link to="/settings" className="underline underline-offset-2">
            Cài đặt
          </Link>
          ; nội dung đã đăng sẽ được xử lý theo chính sách bảo mật.
        </p>
      </StaticSection>

      <StaticSection title="5. Liên hệ">
        <p>Thắc mắc về điều khoản: gửi tới địa chỉ hỗ trợ ghi ở trang Giới thiệu.</p>
      </StaticSection>
    </StaticPage>
  )
}
