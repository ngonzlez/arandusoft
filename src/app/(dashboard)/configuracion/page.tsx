import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tieneFeature } from "@/lib/licencia";
import { PageHeader } from "@/components/layout/PageHeader";
import { PerfilEstudioForm } from "@/components/configuracion/PerfilEstudioForm";
import { CatalogoGeografico } from "@/components/configuracion/CatalogoGeografico";
import { CatalogoJuzgados } from "@/components/configuracion/CatalogoJuzgados";
import { ClienteTabs } from "@/components/clientes/ClienteTabs";

export const metadata = { title: "Configuración — ArandúSoft" };

export default async function ConfiguracionPage() {
  const session = await auth();
  const rol = session!.user.rol;
  if (!["ADMIN", "JURIDICO"].includes(rol)) redirect("/dashboard");
  // JURIDICO solo entra acá por los catálogos judiciales — sin la feature no
  // tiene nada que hacer en esta página (ADMIN sí, para armar catálogos antes
  // de habilitar el módulo, o por el perfil del estudio que es independiente).
  if (rol === "JURIDICO" && !(await tieneFeature("juridico"))) redirect("/dashboard");

  const [perfil, departamentos, juzgados] = await Promise.all([
    rol === "ADMIN" ? prisma.perfilEstudio.findFirst() : Promise.resolve(null),
    prisma.departamento.findMany({
      orderBy: { nombre: "asc" },
      include: { ciudades: { orderBy: { nombre: "asc" }, select: { id: true, nombre: true } } },
    }),
    prisma.juzgado.findMany({
      orderBy: [{ circunscripcion: "asc" }, { nombre: "asc" }],
      include: { secretarias: { orderBy: { nombre: "asc" } } },
    }),
  ]);

  const tabs = [
    ...(rol === "ADMIN"
      ? [
          {
            key: "perfil",
            label: "Perfil del estudio",
            content: <PerfilEstudioForm perfil={JSON.parse(JSON.stringify(perfil))} />,
          },
        ]
      : []),
    {
      key: "juzgados",
      label: "Juzgados y Secretarías",
      content: <CatalogoJuzgados juzgados={JSON.parse(JSON.stringify(juzgados))} />,
    },
    {
      key: "geografia",
      label: "Departamentos y Ciudades",
      content: <CatalogoGeografico departamentos={JSON.parse(JSON.stringify(departamentos))} />,
    },
  ];

  return (
    <div>
      <PageHeader
        titulo="Configuración"
        subtitulo="Datos del estudio y catálogos de referencia para expedientes"
      />
      <ClienteTabs tabs={tabs} />
    </div>
  );
}
