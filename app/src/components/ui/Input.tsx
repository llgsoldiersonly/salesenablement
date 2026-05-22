import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";

/**
 * Inputs — per inputs.md.
 *
 * The exported `<Input />` and `<Textarea />` components are the preferred
 * way to render form controls. For places that need to style their own
 * native element with the same look (e.g. <select> inside a custom dropdown),
 * import the `inputClass` string and apply it directly.
 */

export const inputClass =
  "w-full bg-neutral-primary-soft rounded-[8px] border border-[var(--color-border-default-medium)] " +
  "px-3 py-2.5 text-sm text-heading shadow-inset " +
  "placeholder:text-body-subtle " +
  "hover:border-[var(--color-border-default-strong)] " +
  "focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand " +
  "disabled:bg-[var(--color-disabled)] disabled:text-[var(--color-fg-disabled)] disabled:cursor-not-allowed " +
  "transition-colors duration-200";

export const inputClassError =
  "w-full bg-neutral-primary-soft rounded-[8px] border border-[var(--color-border-danger)] " +
  "px-3 py-2.5 text-sm text-heading shadow-inset " +
  "placeholder:text-body-subtle " +
  "focus:outline-none focus:border-[var(--color-border-danger)] focus:ring-1 focus:ring-[var(--color-border-danger)] " +
  "transition-colors duration-200";

export const labelClass =
  "block text-sm font-medium text-heading mb-2";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leadingIcon, trailingIcon, id, className = "", containerClassName = "", ...props },
  ref,
) {
  const inputId = id ?? props.name ?? undefined;
  const cls = error ? inputClassError : inputClass;
  const withIconPadding = [
    leadingIcon ? "pl-9" : "",
    trailingIcon ? "pr-9" : "",
  ].join(" ");

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className={labelClass}>
          {label}
        </label>
      )}
      <div className="relative">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle inline-flex items-center">
            {leadingIcon}
          </span>
        )}
        <input ref={ref} id={inputId} className={[cls, withIconPadding, className].join(" ")} {...props} />
        {trailingIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-body-subtle inline-flex items-center">
            {trailingIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-fg-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-body-subtle">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className = "", containerClassName = "", ...props },
  ref,
) {
  const textareaId = id ?? props.name ?? undefined;
  const cls = error ? inputClassError : inputClass;
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={textareaId} className={labelClass}>
          {label}
        </label>
      )}
      <textarea ref={ref} id={textareaId} className={[cls, "resize-y min-h-[80px]", className].join(" ")} {...props} />
      {error ? (
        <p className="mt-1.5 text-xs text-fg-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-body-subtle">{hint}</p>
      ) : null}
    </div>
  );
});
