import { v2 as cloudinary } from "cloudinary";

// Archivos de declaraciones (PDF o el Excel de Marangatu/DNIT): se suben como
// recurso raw PRIVADO en Cloudinary. La descarga siempre pasa por URL firmada
// con expiración corta.

export type FormatoArchivo = "pdf" | "xlsx";

let configurado = false;

function ensureConfig() {
  if (configurado) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary no está configurado (CLOUDINARY_* en .env)");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configurado = true;
}

export async function subirArchivoDeclaracion(
  buffer: Buffer,
  carpeta: string,
  nombreBase: string,
  formato: FormatoArchivo
): Promise<{ url: string; publicId: string; bytes: number }> {
  ensureConfig();

  const publicId = `${carpeta}/${nombreBase}-${Date.now()}`;

  const resultado = await new Promise<{ secure_url: string; public_id: string; bytes: number }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          resource_type: "raw",
          type: "private",
          format: formato,
        },
        (err, res) => {
          if (err || !res) reject(err ?? new Error("Upload sin respuesta"));
          else resolve(res as never);
        }
      );
      stream.end(buffer);
    }
  );

  return {
    url: resultado.secure_url,
    publicId: resultado.public_id,
    bytes: resultado.bytes,
  };
}

// URL firmada de descarga (default 1 hora; para links por email usar 48-72h).
export function urlFirmadaDeclaracion(
  publicId: string,
  formato: FormatoArchivo,
  expiraEnSegundos = 3600
): string {
  ensureConfig();
  return cloudinary.utils.private_download_url(publicId, formato, {
    resource_type: "raw",
    expires_at: Math.floor(Date.now() / 1000) + expiraEnSegundos,
  });
}

export async function descargarArchivoDeclaracion(
  publicId: string,
  formato: FormatoArchivo
): Promise<Buffer> {
  const url = urlFirmadaDeclaracion(publicId, formato, 300);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
