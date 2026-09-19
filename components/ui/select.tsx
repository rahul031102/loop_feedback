import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border bg-base-2/60 px-3 pr-9 text-sm text-fg",
            "transition-colors duration-150",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-negative focus:border-negative focus:ring-negative/30"
              : "border-border hover:border-border-2",
            className
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-3"
          aria-hidden="true"
        />
      </div>
    );
  }
);
Select.displayName = "Select";
