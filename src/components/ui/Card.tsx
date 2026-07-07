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
}

// Patrón repTiles del prototipo: número grande Poppins + label + sub-label.
export function StatTile({ label, value, sub, subColor, icon }: StatTileProps) {
  return (
    <div className="bg-white rounded-card border border-line p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-muted">{label}</p>
        {icon && <span className="text-gold">{icon}</span>}
      </div>
      <p className="font-heading text-3xl font-bold text-primary mt-1">{value}</p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: subColor ?? "#5A6473" }}>
          {sub}
        </p>
      )}
    </div>
  );
}
