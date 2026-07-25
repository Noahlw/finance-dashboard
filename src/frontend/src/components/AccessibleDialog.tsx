import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

interface AccessibleDialogProps {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
}

export function AccessibleDialog({
  children,
  onClose,
  open,
  title,
}: AccessibleDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!(focusable && focusable.length)) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="glass-card modal-content"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  busy?: boolean;
  confirmLabel?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
  variant?: "primary" | "danger";
}

export function ConfirmDialog({
  busy = false,
  confirmLabel = "Confirm",
  message,
  onCancel,
  onConfirm,
  open,
  title,
  variant = "primary",
}: ConfirmDialogProps) {
  return (
    <AccessibleDialog onClose={onCancel} open={open} title={title}>
      <p className="dialog-message">{message}</p>
      <div className="modal-actions">
        <button
          className="secondary-btn"
          disabled={busy}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={variant === "danger" ? "danger-btn" : "primary-btn"}
          disabled={busy}
          onClick={onConfirm}
          type="button"
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </AccessibleDialog>
  );
}

interface NoticeDialogProps {
  message: string;
  onClose: () => void;
  open: boolean;
  title?: string;
}

export function NoticeDialog({
  message,
  onClose,
  open,
  title = "Notice",
}: NoticeDialogProps) {
  return (
    <AccessibleDialog onClose={onClose} open={open} title={title}>
      <p className="dialog-message" role="status">
        {message}
      </p>
      <div className="modal-actions">
        <button className="primary-btn" onClick={onClose} type="button">
          OK
        </button>
      </div>
    </AccessibleDialog>
  );
}

export function useNoticeDialog() {
  const [message, setMessage] = useState("");
  return {
    noticeDialog: (
      <NoticeDialog
        message={message}
        onClose={() => setMessage("")}
        open={Boolean(message)}
      />
    ),
    showNotice: setMessage,
  };
}

const NOTICE_EVENT = "finance-workspace:notice";
const CONFIRM_EVENT = "finance-workspace:confirm";
let dialogHostMounted = false;

function ensureDialogHost() {
  if (dialogHostMounted) {
    return;
  }
  const container = document.createElement("div");
  container.dataset.accessibleDialogHost = "true";
  document.body.append(container);
  createRoot(container).render(<AccessibleDialogHost />);
}

export function showNotice(message: string) {
  ensureDialogHost();
  window.setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent(NOTICE_EVENT, { detail: { message } })
    );
  }, 0);
}

export function askForConfirmation(
  message: string,
  title = "Confirm action"
): Promise<boolean> {
  return new Promise((resolve) => {
    ensureDialogHost();
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(CONFIRM_EVENT, { detail: { message, resolve, title } })
      );
    }, 0);
  });
}

interface ConfirmationRequest {
  message: string;
  resolve: (confirmed: boolean) => void;
  title: string;
}

export function AccessibleDialogHost() {
  dialogHostMounted = true;
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null
  );

  useEffect(() => {
    const onNotice = (event: Event) => {
      setNotice((event as CustomEvent<{ message: string }>).detail.message);
    };
    const onConfirm = (event: Event) => {
      setConfirmation((event as CustomEvent<ConfirmationRequest>).detail);
    };
    window.addEventListener(NOTICE_EVENT, onNotice);
    window.addEventListener(CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(NOTICE_EVENT, onNotice);
      window.removeEventListener(CONFIRM_EVENT, onConfirm);
    };
  }, []);

  const closeConfirmation = (confirmed: boolean) => {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  };

  return (
    <>
      <NoticeDialog
        message={notice}
        onClose={() => setNotice("")}
        open={Boolean(notice)}
      />
      <ConfirmDialog
        message={confirmation?.message || ""}
        onCancel={() => closeConfirmation(false)}
        onConfirm={() => closeConfirmation(true)}
        open={Boolean(confirmation)}
        title={confirmation?.title || "Confirm action"}
      />
    </>
  );
}
