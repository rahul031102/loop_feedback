import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  /** Optional icon rendered inside the field, left-aligned (e.g. an email
   * or lock glyph). Purely presentational — the input's padding adjusts
   * automatically so text never overlaps it. */
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    const field = (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-lg border bg-base-2/60 text-sm text-fg placeholder:text-fg-3",
          "transition-colors duration-150",
          icon ? "pl-10 pr-3" : "px-3",
          "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-negative focus:border-negative focus:ring-negative/30"
            : "border-border hover:border-border-2",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
    );

    if (!icon) return field;

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3">
          {icon}
        </span>
        {field}
      </div>
    );
  }
);
Input.displayName = "Input";
