import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportarClientes } from "@/components/importar/ImportarClientes";

export const metadata = { title: "Importar clientes — ArandúSoft" };

export default async function ImportarPage() {
  const session = await auth();
  if (session!.user.rol !== "ADMIN") redirect("/clientes");

  return (
    <div>
      <PageHeader
        titulo="Importar clientes desde Excel"
        subtitulo="Subí el archivo, revisá el preview y confirmá la importación"
      />
      <ImportarClientes />
    </div>
  );
}
