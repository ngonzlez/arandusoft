interface SkeletonProps {
  className?: string;
}

// Primitiva de loading state. Sin librería de merge de clases (el proyecto no
// tiene cn/clsx) — evitamos que un className con su propio "rounded-*" choque
// con el "rounded" por defecto simplemente omitiéndolo cuando ya viene dado.
export function Skeleton({ className = "" }: SkeletonProps) {
  const rounded = className.includes("rounded") ? "" : "rounded";
  return <div className={`animate-pulse ${rounded} bg-line ${className}`} />;
}
