interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = "" }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-card border border-line bg-white ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-surface/60">{children}</tr>
    </thead>
  );
}

export function TH({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left py-3 px-4 font-medium text-ink-muted text-xs uppercase tracking-wide whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function TRow({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-line/60 last:border-0 transition-colors ${
        onClick ? "cursor-pointer hover:bg-surface/50" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`py-3 px-4 ${className}`}>{children}</td>;
}
