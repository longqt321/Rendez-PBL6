import { Link } from "react-router"
import { StaticPage, StaticSection } from "../components/static-page"

export function PrivacyPage() {
  return (
    <StaticPage
      title="Chính sách bảo mật"
      description="Bản nháp — cho biết Rendez thu thập gì và dùng để làm gì. Cập nhật lần cuối: 12/11/2026."
    >
      <StaticSection title="Dữ liệu chúng tôi lưu">
        <p>
          Email (để đăng nhập và xác thực), tên hiển thị, handle, giới thiệu, địa điểm, ảnh đại
          diện/ảnh bìa, cùng nội dung bạn đăng: bài viết, bình luận, đánh giá, bộ sưu tập.
        </p>
      </StaticSection>

      <StaticSection title="Dùng để làm gì">
        <p>
          Hiển thị hồ sơ và nội dung của bạn cho người xem, gửi email xác thực/đặt lại mật khẩu, và
          tính các gợi ý địa điểm. Chúng tôi không bán dữ liệu cá nhân cho bên thứ ba.
        </p>
      </StaticSection>

      <StaticSection title="Ai xem được">
        <p>
          Hồ sơ công khai (tên, handle, giới thiệu, bài đăng) hiển thị cho mọi người. Bật “hồ sơ
          riêng tư” trong{" "}
          <Link to="/settings" className="underline underline-offset-2">
            Cài đặt
          </Link>{" "}
          để hạn chế người lạ xem nội dung của bạn. Email và mật khẩu không bao giờ hiển thị công
          khai.
        </p>
      </StaticSection>

      <StaticSection title="Ảnh và lưu trữ">
        <p>
          Ảnh được lưu trên dịch vụ lưu trữ đối tượng (R2) và chỉ phục vụ hiển thị trong ứng dụng.
          Khi bạn xoá ảnh hoặc xoá tài khoản, ảnh tương ứng bị gỡ khỏi hồ sơ.
        </p>
      </StaticSection>

      <StaticSection title="Quyền của bạn">
        <p>
          Bạn có thể sửa hoặc xoá thông tin hồ sơ, xoá từng bài đăng/bình luận, và xoá tài khoản
          trong Cài đặt. Xoá tài khoản sẽ thu hồi mọi phiên đăng nhập.
        </p>
      </StaticSection>
    </StaticPage>
  )
}
