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
      className="dialog"
    >
      <h2 id="confirm-dialog-title" className="dialog__title">
        {title}
      </h2>
      <p id="confirm-dialog-desc" className="dialog__description">
        {description}
      </p>
      <div className="dialog__actions">
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
          variant={isDestructive ? "destructive" : "primary"}
          disabled={isLoading}
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
