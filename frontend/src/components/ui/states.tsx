import type { ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import { ApiError } from "../../lib/api/client";
import { Button } from "./button";

/**
 * Feedback states.
 *
 * Every screen that fetches has exactly three non-happy outcomes: loading,
 * failure and empty. Centralising them keeps wording, roles and recovery
 * actions consistent, and guarantees a failure is never rendered as if it were
 * an empty result.
 */

export function LoadingState({
  label = "Đang tải",
  variant = "grid",
}: {
  label?: string;
  variant?: "grid" | "list" | "inline";
}) {
  if (variant === "inline") {
    return (
      <p role="status" aria-label={label} className="muted small">
        {label}…
      </p>
    );
  }
  const count = variant === "grid" ? 6 : 3;
  return (
    <div role="status" aria-label={label} className="skeleton-grid">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton-card" key={index}>
          <div className="skeleton-block skeleton-card__media" />
          <div className="skeleton-block skeleton-card__line" />
          <div className="skeleton-block skeleton-card__line skeleton-card__line--short" />
        </div>
      ))}
    </div>
  );
}

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  /** Where "sign in again" should return to. */
  returnTo?: string;
};

/** Human wording for an API failure. Never leaks server internals. */
function describe(error: unknown): {
  title: string;
  body: string;
  icon: "offline" | "alert";
  needsLogin: boolean;
} {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return {
        title: "Nội dung không còn khả dụng",
        body: "Nội dung này đã bị xóa hoặc đường dẫn không đúng.",
        icon: "alert",
        needsLogin: false,
      };
    }
    if (error.status === 403) {
      return {
        title: "Không có quyền truy cập",
        body: "Bạn không có quyền xem hoặc thực hiện thao tác này.",
        icon: "alert",
        needsLogin: false,
      };
    }
    if (error.status === 401) {
      return {
        title: "Phiên đăng nhập đã hết hạn",
        body: "Vui lòng đăng nhập lại để tiếp tục sử dụng.",
        icon: "alert",
        needsLogin: true,
      };
    }
    if (error.status >= 500) {
      return {
        title: "Máy chủ hiện không phản hồi",
        body: "Bạn có thể thử lại sau ít phút.",
        icon: "offline",
        needsLogin: false,
      };
    }
    return {
      title: "Không thể tải nội dung",
      body: error.message,
      icon: "alert",
      needsLogin: false,
    };
  }
  return {
    title: "Không kết nối được",
    body: "Kiểm tra kết nối mạng rồi thử lại.",
    icon: "offline",
    needsLogin: false,
  };
}

export function ErrorState({ error, onRetry, returnTo }: ErrorStateProps) {
  const { title, body, icon, needsLogin } = describe(error);
  const Icon = icon === "offline" ? WifiOff : AlertTriangle;
  const fields =
    error instanceof ApiError && error.status < 500
      ? Object.entries(error.fields)
      : [];

  return (
    <div className="feedback" role="alert">
      <span className="feedback__icon">
        <Icon size={24} aria-hidden />
      </span>
      <p className="feedback__title">{title}</p>
      <p className="feedback__body">{body}</p>
      {fields.length > 0 && (
        <div className="error">
          {fields.map(([field, value]) => (
            <p key={field}>{flatten(value)}</p>
          ))}
        </div>
      )}
      <div className="feedback__actions">
        {needsLogin ? (
          <Button asChild>
            <Link to="/login" state={returnTo ? { returnTo } : undefined}>
              Đăng nhập lại
            </Link>
          </Button>
        ) : (
          onRetry && (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw size={16} aria-hidden />
              Thử lại
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function flatten(value: unknown): string {
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (value !== null && typeof value === "object") {
    return Object.values(value).map(flatten).join(" ");
  }
  return String(value ?? "");
}

export function EmptyState({
  title,
  body,
  icon,
  actions,
  compact = false,
}: {
  title: string;
  body?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "feedback feedback--compact" : "feedback"}>
      <span className="feedback__icon">
        {icon ?? <Inbox size={24} aria-hidden />}
      </span>
      <p className="feedback__title">{title}</p>
      {body ? <p className="feedback__body">{body}</p> : null}
      {actions ? <div className="feedback__actions">{actions}</div> : null}
    </div>
  );
}

/**
 * One entry point that picks the right state. Passing `pending` wins over
 * `error`, and `error` wins over `empty` — a failed request must never be
 * described as "nothing here".
 */
export function AsyncState({
  pending,
  error,
  empty,
  onRetry,
  returnTo,
  loadingLabel,
  loadingVariant,
  emptyIcon,
  emptyBody,
  emptyActions,
}: {
  pending?: boolean;
  error?: unknown;
  empty?: string | null;
  onRetry?: () => void;
  returnTo?: string;
  loadingLabel?: string;
  loadingVariant?: "grid" | "list" | "inline";
  emptyIcon?: ReactNode;
  emptyBody?: ReactNode;
  emptyActions?: ReactNode;
}) {
  if (pending) {
    return <LoadingState label={loadingLabel} variant={loadingVariant} />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} returnTo={returnTo} />;
  }
  if (empty) {
    return (
      <EmptyState
        title={empty}
        body={emptyBody}
        icon={emptyIcon}
        actions={emptyActions}
      />
    );
  }
  return null;
}
