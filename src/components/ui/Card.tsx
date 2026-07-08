interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <div className={`bg-white rounded-card border border-line p-6 ${className}`}>
      {children}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  icon?: React.ReactNode;
  tint?: string; // color del ícono
  tintBg?: string; // fondo del círculo del ícono
}

// Patrón "stats" del prototipo: label + círculo de ícono tintado arriba,
// número grande abajo, sub-label de color.
export function StatTile({ label, value, sub, subColor, icon, tint, tintBg }: StatTileProps) {
  return (
    <div className="bg-white rounded-card border border-line p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        {icon && (
          <span
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]"
            style={{ color: tint ?? "#1A2C4E", backgroundColor: tintBg ?? "rgba(26,44,78,.08)" }}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="font-heading text-[30px] font-bold text-primary leading-none">{value}</p>
      {sub && (
        <p className="text-xs mt-1.5" style={{ color: subColor ?? "#64748B" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
