import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-light hover:shadow active:bg-primary-dark",
  secondary: "bg-gold text-gold-ink shadow-sm hover:bg-gold-dark hover:shadow active:bg-gold-dark",
  outline:
    "border-[1.5px] border-primary/40 text-primary bg-white hover:border-primary hover:bg-primary/5 active:bg-primary/10",
  danger: "bg-urgent text-white shadow-sm hover:bg-urgent/90 hover:shadow active:bg-urgent/80",
  ghost: "text-ink-muted hover:bg-primary/5 hover:text-primary active:bg-primary/10",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
