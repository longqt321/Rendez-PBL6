import { useEffect, useRef } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") {
          dialog.showModal();
        } else {
          dialog.setAttribute("open", "");
        }
      }
    } else {
      if (dialog.open) {
        if (typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
      }
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (!isLoading) onCancel();
      }}
      className="profile-settings-dialog rounded-xl p-6 shadow-xl border border-line bg-white max-w-md w-full"
    >
      <h2 id="confirm-dialog-title" className="text-lg font-bold mb-2">
        {title}
      </h2>
      <p
        id="confirm-dialog-desc"
        className="text-sm text-muted mb-6 leading-relaxed"
      >
        {description}
      </p>
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          type="button"
          disabled={isLoading}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          disabled={isLoading}
          className={isDestructive ? "danger-button" : ""}
          onClick={() => {
            if (isLoading) return;
            onConfirm();
          }}
        >
          {isLoading ? "Đang xử lý…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
