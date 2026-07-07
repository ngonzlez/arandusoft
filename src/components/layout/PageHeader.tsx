interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  acciones?: React.ReactNode;
}

export function PageHeader({ titulo, subtitulo, acciones }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-primary">{titulo}</h1>
        {subtitulo && <p className="text-sm text-ink-muted mt-0.5">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  );
}
