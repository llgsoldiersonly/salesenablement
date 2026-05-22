import { useEffect, type ReactNode } from "react";

/**
 * Modal — per modals.md.
 *
 *   <Modal open={...} onClose={...} size="md">
 *     <ModalHeader>Title</ModalHeader>
 *     <ModalBody>...form / content...</ModalBody>
 *     <ModalFooter>...actions...</ModalFooter>
 *   </Modal>
 *
 * Backdrop (z-40, black/50 + small blur) + container (shadow-xl, 8px radius,
 * 20px padding). ESC closes; backdrop click closes. Header and footer get
 * border-default dividers inside the container.
 */

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  ariaLabel?: string;
  children: ReactNode;
  /** When false, backdrop clicks don't close. ESC still closes. */
  closeOnBackdrop?: boolean;
}

export function Modal({
  open,
  onClose,
  size = "md",
  ariaLabel,
  children,
  closeOnBackdrop = true,
}: ModalProps) {
  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div
        className={[
          "relative w-full bg-neutral-primary rounded-[8px] shadow-xl border border-[var(--color-border-default)]",
          "flex flex-col max-h-[calc(100vh-2rem)]",
          sizeClasses[size],
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  children: ReactNode;
  onClose?: () => void;
  subtitle?: ReactNode;
}

export function ModalHeader({ children, onClose, subtitle }: ModalHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--color-border-default)]">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold text-heading leading-tight">{children}</h2>
        {subtitle && <p className="text-xs text-body-subtle mt-1">{subtitle}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 -mt-1 -mr-1 w-8 h-8 rounded-[8px] inline-flex items-center justify-center text-body-subtle hover:bg-neutral-secondary-medium hover:text-heading transition-colors"
        >
          ✕
        </button>
      )}
    </header>
  );
}

export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={["px-5 py-5 overflow-y-auto scrollbar-thin flex-1", className].join(" ")}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={[
        "flex items-center justify-end gap-2 px-5 py-3",
        "border-t border-[var(--color-border-default)] bg-neutral-secondary-soft rounded-b-[8px]",
        className,
      ].join(" ")}
    >
      {children}
    </footer>
  );
}
