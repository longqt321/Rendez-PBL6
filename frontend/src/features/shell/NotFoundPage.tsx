import { Link } from "react-router";
import { Compass, Search } from "lucide-react";
import { Button } from "../../components/ui/button";

/**
 * 404.
 *
 * A dead end is a navigation failure, so the page offers the two ways back
 * into the product rather than only an apology.
 */
export function NotFoundPage() {
  return (
    <div className="not-found container container--narrow">
      <p className="eyebrow">Lỗi 404</p>
      <h1>Không tìm thấy trang</h1>
      <p className="lede">
        Đường dẫn này không còn tồn tại, hoặc nội dung đã được chuyển đi nơi
        khác.
      </p>
      <div className="cluster">
        <Button asChild>
          <Link to="/discover">
            <Compass size={16} aria-hidden />
            Về Khám phá
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/search">
            <Search size={16} aria-hidden />
            Tìm địa điểm
          </Link>
        </Button>
      </div>
    </div>
  );
}
