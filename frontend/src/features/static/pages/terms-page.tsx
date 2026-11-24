import { Link } from "react-router"
import { StaticPage, StaticSection } from "../components/static-page"

export function TermsSections({ compact = false }: Readonly<{ compact?: boolean }>) {
  return (
    <div className={compact ? "flex flex-col gap-5 text-sm leading-relaxed" : "contents"}>
      <StaticSection title="1. Điều kiện sử dụng & Chấp nhận điều khoản">
        <p>
          Khi đăng ký tài khoản hoặc thực hiện đăng nhập lần đầu vào Rendez, bạn xác nhận đã đọc,
          hiểu và đồng ý tuân thủ đầy đủ Điều khoản sử dụng này cùng{" "}
          <Link to="/privacy" className="font-medium text-primary underline underline-offset-2">
            Chính sách bảo mật
          </Link>
          . Nếu không đồng ý với bất kỳ nội dung nào, bạn vui lòng không tiếp tục đăng ký hoặc sử
          dụng dịch vụ.
        </p>
        <p>
          Mỗi tài khoản gắn với một địa chỉ email hợp lệ đã được xác thực và một tên định danh
          (@handle) riêng. Bạn chịu trách nhiệm bảo mật mật khẩu cũng như mọi hoạt động phát sinh từ
          phiên đăng nhập của mình.
        </p>
      </StaticSection>

      <StaticSection title="2. Quyền và trách nhiệm đối với nội dung cộng đồng">
        <p>
          Người dùng có thể đăng bài trải nghiệm, đánh giá địa điểm theo 4 mức độ hài lòng, gợi ý
          món nên thử, đóng góp ảnh thực tế, tạo bộ sưu tập và gửi đề xuất địa điểm mới tại Đà Nẵng.
          Bạn cam kết nội dung chia sẻ do chính bạn tạo hoặc có quyền sử dụng hợp pháp.
        </p>
        <p>
          Bằng việc đăng tải công khai trên Rendez, bạn cấp cho hệ thống quyền hiển thị, sắp xếp và
          lập chỉ mục tìm kiếm nội dung đó nhằm phục vụ cộng đồng khám phá địa điểm. Bạn giữ quyền
          chỉnh sửa hoặc xoá bài đăng, đánh giá của mình bất kỳ lúc nào.
        </p>
      </StaticSection>

      <StaticSection title="3. Hành vi bị nghiêm cấm">
        <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
          <li>
            Đăng đánh giá giả mạo, thao túng xếp hạng, quảng cáo trái phép hoặc gửi nội dung trùng
            lặp hàng loạt (spam).
          </li>
          <li>
            Đăng tải hình ảnh, bình luận hoặc tin nhắn trực tiếp mang tính quấy rối, xúc phạm danh
            dự, mạo danh cá nhân hay tổ chức khác.
          </li>
          <li>
            Khai thác dữ liệu tự động trái phép, thử vượt cơ chế phân quyền, giới hạn tốc độ hoặc
            làm gián đoạn hoạt động máy chủ.
          </li>
        </ul>
      </StaticSection>

      <StaticSection title="4. Dữ liệu vị trí & Phòng nhóm cộng tác">
        <p>
          Tính năng Khám phá theo khoảng cách và Phòng nhóm cộng tác sử dụng điểm neo do bạn chọn
          hoặc tọa độ GPS khi bạn cấp quyền. Nếu bật đồng bộ GPS trên tài khoản, vị trí được mã hoá
          trước khi lưu và chỉ phục vụ tính khoảng cách gợi ý cho bạn hoặc hiển thị ghim trong phòng
          nhóm bạn đang tham gia.
        </p>
      </StaticSection>

      <StaticSection title="5. Tính tham khảo của thông tin địa điểm">
        <p>
          Thông tin quán (giờ mở cửa, mức giá, tình trạng hoạt động, địa chỉ) được tổng hợp từ dữ
          liệu công khai và đóng góp cộng đồng nên có thể thay đổi ngoài thực tế. Rendez không bảo
          đảm tuyệt đối độ chính xác theo thời gian thực và khuyến nghị bạn kiểm tra lại trực tiếp
          với địa điểm trước khi di chuyển.
        </p>
      </StaticSection>

      <StaticSection title="6. Kiểm duyệt vi phạm & Xoá tài khoản">
        <p>
          Các báo cáo sai lệch thông tin, nội dung vi phạm hoặc đề xuất địa điểm mới đều được ban
          quản trị rà soát và lưu nhật ký kiểm toán. Tài khoản vi phạm nghiêm trọng có thể bị tạm
          khoá hoặc hạn chế quyền truy cập. Bạn có thể tự xoá vĩnh viễn tài khoản bất kỳ lúc nào
          trong mục{" "}
          <Link to="/settings" className="font-medium text-primary underline underline-offset-2">
            Cài đặt
          </Link>{" "}
          để ẩn danh hoá thông tin cá nhân và thu hồi toàn bộ phiên đang hoạt động.
        </p>
      </StaticSection>

      <StaticSection title="7. Thay đổi điều khoản">
        <p>
          Rendez có thể cập nhật Điều khoản sử dụng khi bổ sung tính năng hoặc điều chỉnh quy định
          vận hành. Phiên bản mới nhất luôn được công bố công khai tại trang này kèm ngày cập nhật.
        </p>
      </StaticSection>
    </div>
  )
}

export function TermsPage() {
  return (
    <StaticPage
      title="Điều khoản sử dụng"
      description="Quy định khi đăng ký tài khoản, chia sẻ trải nghiệm và sử dụng các tính năng trên Rendez. Cập nhật lần cuối: 25/11/2026."
    >
      <TermsSections />
    </StaticPage>
  )
}
