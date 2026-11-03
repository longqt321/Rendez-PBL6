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
    <div className="submission-detail">
      <Link className="back-link" to="/profile">
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
          <header className="page-head">
            <div className="page-head__copy">
              <h1>{submission.place_name}</h1>
              <p className="muted small">
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
            <p className="error">Lý do gỡ: {submission.reason}</p>
          )}

          {submission.caption && <p className="prose">{submission.caption}</p>}

          <ul className="gallery-grid" role="list">
            {submission.assets.map((asset) => (
              <li key={asset.id} className="gallery-grid__item">
                <img
                  src={asset.preview_url}
                  alt="Ảnh đã gửi"
                  loading="lazy"
                  decoding="async"
                />
                {asset.publication_status === "published" && (
                  <Link to={"/photos/" + asset.public_photo_id}>
                    <CheckCircle2 size={14} aria-hidden />
                    Xem ảnh
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="cluster">
            <Button asChild>
              <Link to="/create">Đăng thêm ảnh</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
