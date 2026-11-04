import type { ReactNode } from "react";
import { Link } from "react-router";
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import { ApiError } from "../../lib/api/client";
import { Button } from "./button";

function LoadingState({
  label = "Đang tải",
  variant = "grid",
}: {
  label?: string;
  variant?: "grid" | "list" | "inline";
}) {
  if (variant === "inline") {
    return (
      <p role="status" aria-label={label} className="text-xs text-neutral-500">
        {label}…
      </p>
    );
  }
  const count = variant === "grid" ? 6 : 3;
  return (
    <div role="status" aria-label={label} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div className="flex flex-col gap-2.5 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900" key={index}>
          <div className="rounded-md bg-neutral-200 dark:bg-neutral-800 animate-pulse aspect-[4/5]" />
          <div className="rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse h-3.5 w-3/4" />
          <div className="rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

type ErrorStateProps = {
  error: unknown;
  onRetry?: () => void;
  returnTo?: string;
};

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

function flatten(value: unknown): string {
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (value !== null && typeof value === "object") {
    return Object.values(value).map(flatten).join(" ");
  }
  return String(value ?? "");
}

function ErrorState({ error, onRetry, returnTo }: ErrorStateProps) {
  const { title, body, icon, needsLogin } = describe(error);
  const Icon = icon === "offline" ? WifiOff : AlertTriangle;
  const fields =
    error instanceof ApiError && error.status < 500
      ? Object.entries(error.fields)
      : [];

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center" role="alert">
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
        <Icon size={22} aria-hidden />
      </span>
      <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-500 max-w-sm">{body}</p>
      {fields.length > 0 && (
        <div className="text-xs text-red-600 dark:text-red-400">
          {fields.map(([field, value]) => (
            <p key={field} className="mt-1">{flatten(value)}</p>
          ))}
        </div>
      )}
      <div className="flex justify-center gap-2 mt-2">
        {needsLogin ? (
          <Button asChild size="sm">
            <Link to="/login" state={returnTo ? { returnTo } : undefined}>
              Đăng nhập lại
            </Link>
          </Button>
        ) : (
          onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw size={14} aria-hidden />
              Thử lại
            </Button>
          )
        )}
      </div>
    </div>
  );
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
    <div
      className={
        compact
          ? "flex flex-col items-center justify-center gap-2 py-8 px-4 text-center"
          : "flex flex-col items-center justify-center gap-3 py-14 px-4 text-center"
      }
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400">
        {icon ?? <Inbox size={22} aria-hidden />}
      </span>
      <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200">{title}</p>
      {body ? <p className="text-sm text-neutral-500 max-w-sm">{body}</p> : null}
      {actions ? <div className="flex justify-center gap-2 mt-2">{actions}</div> : null}
    </div>
  );
}

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
