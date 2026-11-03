import { ApiError } from "../../lib/api/client";

function errorMessage(value: unknown): string {
  if (Array.isArray(value)) return value.map(errorMessage).join(" ");
  if (value !== null && typeof value === "object")
    return Object.values(value).map(errorMessage).join(" ");
  return String(value ?? "");
}

/**
 * The one inline error line.
 *
 * Server-side 5xx details are never shown; the user gets a retry message
 * instead. Field-level messages are only rendered for 4xx responses.
 */
export function ErrorText({ error }: { error: Error | null }) {
  if (!error) return null;
  const isServerInternal = error instanceof ApiError && error.status >= 500;
  const safeMessage = isServerInternal
    ? "Máy chủ hiện không phản hồi. Vui lòng thử lại sau."
    : error instanceof ApiError
      ? error.message
      : "Không kết nối được. Kiểm tra kết nối mạng rồi thử lại.";

  return (
    <div role="alert" className="error">
      <p>{safeMessage}</p>
      {error instanceof ApiError &&
        error.status < 500 &&
        Object.entries(error.fields).map(([key, value]) => (
          <p key={key}>{errorMessage(value)}</p>
        ))}
    </div>
  );
}
