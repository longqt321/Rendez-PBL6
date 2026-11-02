import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Compass, Search } from "lucide-react";
import { Button } from "../../components/ui/button";

/**
 * 404.
 *
 * A dead end is a navigation failure, so the page offers the two ways back
 * into the product rather than only an apology. Automatically redirects to
 * /discover after 3 seconds so the user is never stranded on a broken URL.
 */
export function NotFoundPage() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    if (secondsLeft <= 0) {
      navigate("/discover", { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, navigate]);

  return (
    <div className="not-found container container--narrow">
      <h1>Không tìm thấy trang</h1>
      <p className="lede">
        Đường dẫn này không tồn tại hoặc đã thay đổi. Tự động chuyển về trang Khám phá sau {secondsLeft} giây…
      </p>
      <div className="cluster">
        <Button asChild>
          <Link to="/discover">
            <Compass size={16} aria-hidden />
            Về Khám phá
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/map">
            <Search size={16} aria-hidden />
            Tìm địa điểm
          </Link>
        </Button>
      </div>
    </div>
  );
}
