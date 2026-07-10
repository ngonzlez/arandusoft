// Catálogo central de features vendibles por estudio. El superadmin las
// prende/apaga desde /admin/licencia (Licencia.features en DB) — mismo
// binario para todos los clientes, distinta configuración.
// Sin imports de Prisma: este archivo se importa también desde client components.

export const FEATURES = ["juridico", "presupuestos"] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURES_DISPONIBLES: Record<Feature, { label: string; descripcion: string }> = {
  juridico: {
    label: "Módulo Jurídico",
    descripcion: "Expedientes, documentos y notas de casos legales",
  },
  presupuestos: {
    label: "Generador de Presupuestos",
    descripcion: "Presupuestos imprimibles para clientes, con plantillas y firma",
  },
};

export function esFeature(v: string): v is Feature {
  return (FEATURES as readonly string[]).includes(v);
}
