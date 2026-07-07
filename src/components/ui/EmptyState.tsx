interface EmptyStateProps {
  titulo: string;
  descripcion?: string;
  accion?: React.ReactNode;
}

export function EmptyState({ titulo, descripcion, accion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="h-12 w-12 rounded-full bg-surface flex items-center justify-center mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9AA3AF" strokeWidth="1.5">
          <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5l-2 3h-2l-2-3H4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p className="font-heading font-semibold text-primary">{titulo}</p>
      {descripcion && <p className="text-sm text-ink-muted mt-1 max-w-sm">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  );
}
