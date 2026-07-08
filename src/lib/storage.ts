import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Archivos (declaraciones de clientes, documentos de expedientes): se suben
// PRIVADOS a MinIO (self-hosted, compatible S3). La descarga siempre pasa
// por URL firmada con expiración corta — nunca hay acceso público directo,
// son datos confidenciales de clientes.

export type FormatoArchivo = "pdf" | "xlsx" | "docx" | "jpg" | "png";

const CONTENT_TYPE: Record<FormatoArchivo, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  png: "image/png",
};

let cliente: S3Client | null = null;

function getCliente(): S3Client {
  if (cliente) return cliente;
  const { MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY } = process.env;
  if (!MINIO_ENDPOINT || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
    throw new Error("MinIO no está configurado (MINIO_* en .env)");
  }
  cliente = new S3Client({
    endpoint: MINIO_ENDPOINT,
    region: "us-east-1", // MinIO ignora la región real, pero el SDK la exige
    credentials: { accessKeyId: MINIO_ACCESS_KEY, secretAccessKey: MINIO_SECRET_KEY },
    forcePathStyle: true, // requerido por MinIO (no usa buckets como subdominio)
  });
  return cliente;
}

function getBucket(): string {
  return process.env.MINIO_BUCKET || "arandufiles";
}

export async function subirArchivo(
  buffer: Buffer,
  carpeta: string,
  nombreBase: string,
  formato: FormatoArchivo
): Promise<{ url: string; publicId: string; bytes: number }> {
  const key = `${carpeta}/${nombreBase}-${Date.now()}.${formato}`;

  await getCliente().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: CONTENT_TYPE[formato],
    })
  );

  return { url: key, publicId: key, bytes: buffer.length };
}

// URL firmada de descarga (default 1 hora; para links por email usar 48-72h).
export async function urlFirmadaArchivo(
  publicId: string,
  _formato: FormatoArchivo,
  expiraEnSegundos = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getBucket(), Key: publicId });
  return getSignedUrl(getCliente(), command, { expiresIn: expiraEnSegundos });
}

export async function descargarArchivo(
  publicId: string,
  formato: FormatoArchivo
): Promise<Buffer> {
  const url = await urlFirmadaArchivo(publicId, formato, 300);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar el archivo (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
