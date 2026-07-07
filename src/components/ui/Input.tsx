import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

const CONTROL_CLASSES =
  "w-full h-10 px-3 rounded-control border border-line bg-white text-sm text-ink-base placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:bg-surface disabled:text-ink-faint";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, helper, children }: FieldWrapperProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-ink-muted mb-1.5">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-urgent mt-1">{error}</p>}
      {!error && helper && <p className="text-xs text-ink-faint mt-1">{helper}</p>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className = "", ...props }, ref) => (
    <FieldWrapper label={label} error={error} helper={helper}>
      <input ref={ref} className={`${CONTROL_CLASSES} ${className}`} {...props} />
    </FieldWrapper>
  )
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, className = "", children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} helper={helper}>
      <select ref={ref} className={`${CONTROL_CLASSES} ${className}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className = "", ...props }, ref) => (
    <FieldWrapper label={label} error={error} helper={helper}>
      <textarea
        ref={ref}
        className={`${CONTROL_CLASSES} h-auto min-h-[80px] py-2 ${className}`}
        {...props}
      />
    </FieldWrapper>
  )
);
Textarea.displayName = "Textarea";
