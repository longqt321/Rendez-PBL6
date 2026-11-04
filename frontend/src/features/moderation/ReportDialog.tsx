import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Flag } from "lucide-react";
import { api, ApiError } from "../../lib/api/client";
import { useMe } from "../../lib/session";
import { Button } from "../../components/ui/button";
import { ErrorText } from "../../components/ui/error-text";

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

const reportSchema = z.object({
  reason: z.string().min(1, "Vui lòng chọn lý do."),
  note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự.").optional(),
});
type ReportValues = z.infer<typeof reportSchema>;

export function ReportDialog({
  kind,
  id,
}: {
  kind: "photos" | "places";
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [done, setDone] = useState(false);

  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { reason: "wrong_place", note: "" },
  });

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

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    setError(null);
    try {
      await api(`${kind}/${id}/report/`, {
        method: "POST",
        body: JSON.stringify({ reason: values.reason, note: (values.note || "").trim() }),
      });
      setDone(true);
      form.reset({ reason: "wrong_place", note: "" });
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught
          : new Error("Không gửi được báo cáo."),
      );
    } finally {
      setPending(false);
    }
  });

  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="inline-link inline-link--muted flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
        onClick={() => {
          if (!me.data) {
            navigate("/login", {
              state: { returnTo: location.pathname + location.search },
            });
            return;
          }
          setDone(false);
          setError(null);
          form.reset({ reason: "wrong_place", note: "" });
          setOpen(true);
        }}
      >
        <Flag size={14} aria-hidden />
        Báo cáo nội dung
      </button>

      <dialog
        ref={dialog}
        className="dialog p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl backdrop:bg-black/50 max-w-md w-full"
        aria-labelledby={"report-title-" + id}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => setOpen(false)}
      >
        <div className="dialog__head mb-4">
          <h2 className="dialog__title text-lg font-bold text-neutral-900 dark:text-neutral-100" id={"report-title-" + id}>
            Báo cáo nội dung
          </h2>
        </div>

        {done ? (
          <>
            <p className="dialog__description text-sm text-neutral-600 dark:text-neutral-400 mb-6" role="status">
              Đã nhận báo cáo của bạn. Chúng tôi sẽ xem xét nội dung này.
            </p>
            <div className="dialog__actions flex justify-end">
              <Button onClick={close}>Đóng</Button>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <p className="dialog__description text-sm text-neutral-600 dark:text-neutral-400">
              Cho chúng tôi biết vấn đề bạn gặp phải. Báo cáo được gửi tới đội
              ngũ kiểm duyệt.
            </p>
            <div className="field flex flex-col gap-1.5">
              <label className="field__label text-xs font-semibold text-neutral-700 dark:text-neutral-300" htmlFor={"report-reason-" + id}>
                Lý do
              </label>
              <select
                id={"report-reason-" + id}
                className="select w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 outline-none"
                {...form.register("reason")}
              >
                {REASONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field flex flex-col gap-1.5">
              <label className="field__label text-xs font-semibold text-neutral-700 dark:text-neutral-300" htmlFor={"report-note-" + id}>
                Ghi chú (không bắt buộc)
              </label>
              <textarea
                id={"report-note-" + id}
                className="textarea w-full px-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 outline-none min-h-[80px]"
                maxLength={1000}
                {...form.register("note")}
              />
            </div>
            <ErrorText error={error} />
            <div className="dialog__actions flex items-center justify-end gap-3 pt-2">
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
