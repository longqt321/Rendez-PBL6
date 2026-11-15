import { Link } from "react-router"
import { StaticPage, StaticSection } from "../components/static-page"

export function AboutPage() {
  return (
    <StaticPage
      title="Về Rendez"
      description="Rendez giúp bạn và nhóm bạn chọn quán nhanh hơn — bằng trải nghiệm thật của cộng đồng Đà Nẵng."
    >
      <StaticSection title="Rendez là gì?">
        <p>
          Rendez là nơi lưu giữ và chia sẻ những quán ăn, quán cà phê đáng ghé ở Đà Nẵng: địa điểm
          kèm đánh giá, ảnh thật do người dùng đăng, bộ sưu tập theo chủ đề và bản đồ xem quán gần
          bạn.
        </p>
      </StaticSection>

      <StaticSection title="Vì sao chọn quán theo nhóm lại khó?">
        <p>
          Mỗi người một gu, một ngân sách, một khoảng di chuyển. Phòng lọc nhóm của Rendez gom sở
          thích cả nhóm trong một mã phòng duy nhất và đề xuất quán vừa ý mọi người — thay vì cả
          nhóm lướt tin nhắn cả tiếng đồng hồ.
        </p>
      </StaticSection>

      <StaticSection title="Bắt đầu từ đâu?">
        <p>
          Mở{" "}
          <Link to="/discover" className="underline underline-offset-2">
            Khám phá
          </Link>{" "}
          để xem các quán đang có, tạo tài khoản để lưu quán, đăng bài và tham gia phòng lọc nhóm.
        </p>
      </StaticSection>
    </StaticPage>
  )
}
