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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (!isLoading) onCancel();
      }}
      className="m-auto w-[min(480px,calc(100vw-32px))] p-6 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl backdrop:bg-black/50"
    >
      <h2 id="confirm-dialog-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">
        {title}
      </h2>
      <p id="confirm-dialog-desc" className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex justify-end gap-2">
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
