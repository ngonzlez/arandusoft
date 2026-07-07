import type { BadgeStyle } from "@/lib/badges";

interface BadgeProps {
  style: BadgeStyle;
  children: React.ReactNode;
}

export function Badge({ style, children }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: style.dot }}
        />
      )}
      {children}
    </span>
  );
}
