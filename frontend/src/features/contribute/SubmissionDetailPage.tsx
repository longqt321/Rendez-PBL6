import { Link, useParams } from "react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, date } from "../../lib/api/client";
import type { PhotoSubmission } from "../../lib/api/types";
import { useMe } from "../../lib/session";
import { AsyncState } from "../../components/ui/states";
import { Badge } from "../../components/ui/primitives";
import { Button } from "../../components/ui/button";

/** Status of one upload batch, shown right after submitting. */
export function SubmissionDetailPage() {
  const { id } = useParams();
  const me = useMe();

  const result = useQuery({
    queryKey: ["submission", id, me.data?.id],
    enabled: Boolean(me.data && id),
    queryFn: () => api<PhotoSubmission>("photo-submissions/" + id + "/"),
  });

  const submission = result.data;

  return (
    <div className="submission-detail max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
      <Link className="back-link inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100" to="/profile">
        <ArrowLeft size={16} aria-hidden />
        Trang cá nhân
      </Link>

      {!submission ? (
        <AsyncState
          pending={result.isPending}
          error={result.error}
          onRetry={() => void result.refetch()}
        />
      ) : (
        <>
          <header className="page-head flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
            <div className="page-head__copy">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">{submission.place_name}</h1>
              <p className="muted small text-xs text-neutral-500 mt-1">
                {date(submission.submitted_at)} · {submission.assets.length} ảnh
              </p>
            </div>
            <Badge tone={submission.assets.length > 0 ? "success" : "neutral"}>
              {submission.assets.some(
                (asset) => asset.publication_status === "published",
              )
                ? "Đã đăng"
                : "Chưa đăng"}
            </Badge>
          </header>

          {submission.reason && (
            <p className="error text-sm text-red-500 font-medium">Lý do gỡ: {submission.reason}</p>
          )}

          {submission.caption && <p className="prose text-sm text-neutral-700 dark:text-neutral-300">{submission.caption}</p>}

          <ul className="gallery-grid grid grid-cols-2 sm:grid-cols-3 gap-4" role="list">
            {submission.assets.map((asset) => (
              <li key={asset.id} className="gallery-grid__item flex flex-col gap-2">
                <div className="rounded-xl overflow-hidden aspect-square bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
                  <img
                    src={asset.preview_url}
                    alt="Ảnh đã gửi"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                {asset.publication_status === "published" && (
                  <Link to={"/photos/" + asset.public_photo_id} className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline">
                    <CheckCircle2 size={14} aria-hidden />
                    Xem ảnh
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="cluster pt-4">
            <Button asChild>
              <Link to="/create">Đăng thêm ảnh</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
