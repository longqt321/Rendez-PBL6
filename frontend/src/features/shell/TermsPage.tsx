import { Link } from "react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "../../components/ui/button";

/**
 * Terms of use.
 *
 * A public document, so it sits outside the session gate: a guest must be able
 * to read what they are agreeing to before creating an account. The text is
 * written as plain prose rather than a table of clauses because the reader is a
 * student deciding whether to contribute a photo, not a lawyer.
 */
export function TermsPage() {
  return (
    <div className="legal-page container container--reading">
      <p className="eyebrow">
        <FileText size={14} aria-hidden /> Điều khoản
      </p>
      <h1>Điều khoản sử dụng</h1>
      <p className="lede">
        Áp dụng cho mọi người dùng Rendez. Cập nhật lần cuối ngày 01 tháng 11
        năm 2026.
      </p>

      <div className="prose">
        <h2>1. Rendez là gì</h2>
        <p>
          Rendez là nền tảng web cộng đồng giúp sinh viên tìm không gian học
          tập, làm việc và sinh hoạt quanh khu vực Đại học Bách khoa Đà Nẵng.
          Nội dung trên Rendez do chính người dùng đóng góp: ảnh thực tế, chú
          thích và trải nghiệm tại từng địa điểm.
        </p>

        <h2>2. Tài khoản</h2>
        <p>
          Bạn cần một tài khoản để đóng góp nội dung, lưu địa điểm và tương tác.
          Bạn chịu trách nhiệm bảo mật mật khẩu của mình và cho mọi hoạt động
          diễn ra dưới tài khoản đó. Tên hiển thị và nội dung bạn đăng là công
          khai với người dùng khác.
        </p>
        <p>
          Bạn có thể ngừng sử dụng dịch vụ bất cứ lúc nào. Khi có yêu cầu, tài
          khoản và nội dung gắn với tài khoản sẽ được xử lý theo mục 8.
        </p>

        <h2>3. Nội dung bạn đăng</h2>
        <p>
          Khi đăng ảnh hoặc trải nghiệm, bạn xác nhận rằng mình có quyền đăng
          nội dung đó và nội dung không xâm phạm quyền của người khác. Bạn giữ
          quyền sở hữu đối với nội dung mình tạo ra.
        </p>
        <p>
          Bạn cấp cho Rendez quyền không độc quyền, miễn phí, có hiệu lực trong
          phạm vi vận hành nền tảng để lưu trữ, chuẩn hóa kích thước, hiển thị
          và phân phối nội dung đó cho người dùng khác. Quyền này chấm dứt khi
          bạn xóa nội dung hoặc tài khoản, trừ phần dữ liệu đã được sao lưu hoặc
          chia sẻ hợp pháp trước đó.
        </p>
        <p>
          Ảnh bạn gửi được công khai ngay sau khi hệ thống xử lý xong. Nội dung
          công khai vẫn chịu hậu kiểm: người kiểm duyệt có thể rút ảnh, gỡ ảnh
          bìa hoặc chỉnh nhãn mô tả, và bạn nhận được thông báo trong trang gói
          đóng góp của mình.
        </p>

        <h2>4. Nội dung không được đăng</h2>
        <p>Bạn không được đăng nội dung thuộc các nhóm sau:</p>
        <ul>
          <li>Ảnh không phải do bạn chụp hoặc không có quyền sử dụng.</li>
          <li>
            Ảnh chứa thông tin cá nhân của người khác khi chưa có sự đồng ý, bao
            gồm khuôn mặt ở cự ly gần, biển số xe, giấy tờ tùy thân.
          </li>
          <li>
            Nội dung xúc phạm, quấy rối, phân biệt đối xử hoặc kích động bạo
            lực.
          </li>
          <li>
            Nội dung sai lệch có chủ đích về một địa điểm, ví dụ ảnh của cơ sở
            khác được gán cho địa điểm đang đăng.
          </li>
          <li>Nội dung quảng cáo, spam hoặc đường dẫn độc hại.</li>
          <li>Nội dung vi phạm pháp luật Việt Nam.</li>
        </ul>
        <p>
          Rendez có thể từ chối, ẩn hoặc xóa nội dung vi phạm, kèm lý do khi nội
          dung do bạn gửi. Tài khoản vi phạm nhiều lần có thể bị khóa.
        </p>

        <h2>5. Xử lý ảnh và dữ liệu kỹ thuật</h2>
        <p>
          Khi bạn gửi ảnh, hệ thống tạo một bản phái sinh đã chuẩn hóa để hiển
          thị công khai. Bản phái sinh này loại bỏ siêu dữ liệu ảnh, bao gồm dữ
          liệu vị trí GPS nếu có. Bản gốc bạn tải lên được lưu riêng và chỉ phục
          vụ chính bạn.
        </p>
        <p>
          Hệ thống ghi lại các thông tin kỹ thuật cần thiết cho vận hành: kích
          thước ảnh, mã băm để phát hiện gửi trùng, thời điểm gửi và trạng thái
          kiểm duyệt.
        </p>

        <h2>6. Hành vi không được thực hiện</h2>
        <ul>
          <li>Thu thập dữ liệu người dùng khác bằng công cụ tự động.</li>
          <li>
            Dùng công cụ tự động để tạo tài khoản hoặc đăng nội dung hàng loạt.
          </li>
          <li>Dò quét, thử nghiệm hoặc khai thác lỗ hổng của hệ thống.</li>
          <li>
            Gửi yêu cầu với khối lượng lớn nhằm làm gián đoạn dịch vụ; hệ thống
            áp dụng giới hạn tần suất theo từng nhóm hành động.
          </li>
          <li>
            Sao chép, tái bản toàn bộ nội dung của nền tảng cho mục đích khác.
          </li>
        </ul>

        <h2>7. Nội dung của người khác và báo cáo</h2>
        <p>
          Mỗi ảnh, địa điểm và trải nghiệm đều có nút báo cáo. Khi nhận báo cáo,
          người kiểm duyệt xem xét và có thể ẩn nội dung. Nếu bạn cho rằng nội
          dung của mình bị xử lý không đúng, hãy phản hồi qua trang chi tiết gói
          đóng góp của bạn.
        </p>

        <h2>8. Lưu trữ và xóa dữ liệu</h2>
        <p>
          Nội dung bạn xóa sẽ ngừng hiển thị ngay với người dùng khác. Bản sao
          lưu trong hệ thống sao lưu được giữ tối đa 30 ngày trước khi bị xóa
          vĩnh viễn. Dữ liệu tổng hợp không gắn với cá nhân, ví dụ số lượt xem
          của một địa điểm, có thể được giữ lại sau khi nội dung gốc bị xóa.
        </p>

        <h2>9. Giới hạn trách nhiệm</h2>
        <p>
          Thông tin địa điểm trên Rendez do cộng đồng đóng góp và có thể chưa
          chính xác tại thời điểm bạn đọc. Giờ mở cửa, giá và tình trạng chỗ
          ngồi có thể thay đổi. Hãy kiểm tra lại với địa điểm trước khi đi.
        </p>
        <p>
          Rendez không chịu trách nhiệm cho thiệt hại phát sinh từ việc bạn dựa
          hoàn toàn vào thông tin do người dùng khác đăng tải.
        </p>

        <h2>10. Thay đổi điều khoản</h2>
        <p>
          Khi điều khoản thay đổi ở phần ảnh hưởng đến quyền của bạn, Rendez sẽ
          thông báo trong ứng dụng trước khi áp dụng. Tiếp tục sử dụng dịch vụ
          sau thời điểm đó được hiểu là bạn chấp nhận nội dung mới.
        </p>

        <h2>11. Liên hệ</h2>
        <p>
          Câu hỏi về điều khoản, báo cáo nội dung hoặc yêu cầu xóa dữ liệu gửi
          tới ban quản trị Rendez qua trang hồ sơ của bạn.
        </p>
      </div>

      <div className="legal-page__back">
        <Button asChild variant="outline">
          <Link to="/discover">
            <ArrowLeft size={16} aria-hidden />
            Về Khám phá
          </Link>
        </Button>
      </div>
    </div>
  );
}
