import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Flag } from "lucide-react";
import { api, ApiError } from "../../lib/api/client";
import { useMe } from "../../lib/session";
import { Button } from "../../components/ui/button";
import { ErrorText } from "../../app/shared";

/**
 * Report dialog.
 *
 * Moderation is a real, backend-backed action, so it is exposed as a plain
 * secondary control rather than hidden. Guests are sent to sign in first —
 * anonymous reports cannot be followed up and the API rejects them anyway.
 */
const REASONS = [
  { value: "wrong_place", label: "Sai địa điểm hoặc sai thông tin" },
  { value: "privacy", label: "Xâm phạm quyền riêng tư" },
  { value: "copyright", label: "Vi phạm quyền sử dụng ảnh" },
  { value: "unsafe", label: "Nội dung không phù hợp" },
  { value: "other", label: "Khác" },
] as const;

export function ReportDialog({
  kind,
  id,
}: {
  kind: "photos" | "places";
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("wrong_place");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(`${kind}/${id}/report/`, {
        method: "POST",
        body: JSON.stringify({ reason, note: note.trim() }),
      });
      setDone(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new Error("Không gửi được báo cáo."),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="inline-link inline-link--muted"
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: { returnTo: location.pathname + location.search },
            });
            return;
          }
          setDone(false);
          setError(null);
          setNote("");
          setOpen(true);
        }}
      >
        <Flag size={14} aria-hidden />
        Báo cáo nội dung
      </button>

      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby={"report-title-" + id}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="dialog__head">
          <h2 className="dialog__title" id={"report-title-" + id}>
            Báo cáo nội dung
          </h2>
        </div>

        {done ? (
          <>
            <p className="dialog__description" role="status">
              Đã nhận báo cáo của bạn. Chúng tôi sẽ xem xét nội dung này.
            </p>
            <div className="dialog__actions">
              <Button onClick={close}>Đóng</Button>
            </div>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="dialog__description">
              Cho chúng tôi biết vấn đề bạn gặp phải. Báo cáo được gửi tới đội
              ngũ kiểm duyệt.
            </p>
            <div className="field">
              <label className="field__label" htmlFor={"report-reason-" + id}>
                Lý do
              </label>
              <select
                id={"report-reason-" + id}
                className="select"
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
              >
                {REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: "var(--space-4)" }}>
              <label className="field__label" htmlFor={"report-note-" + id}>
                Ghi chú (không bắt buộc)
              </label>
              <textarea
                id={"report-note-" + id}
                className="textarea"
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
              />
            </div>
            <ErrorText error={error} />
            <div className="dialog__actions">
              <Button type="button" variant="outline" onClick={close}>
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang gửi…" : "Gửi báo cáo"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
