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
    <div className="not-found max-w-lg mx-auto px-4 py-20 flex flex-col items-center text-center gap-4">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">Không tìm thấy trang</h1>
      <p className="lede text-neutral-600 dark:text-neutral-400">
        Đường dẫn này không tồn tại hoặc đã thay đổi.
      </p>
      <div className="cluster flex items-center justify-center gap-3 mt-4">
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
