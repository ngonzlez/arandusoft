import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Cifrado AES-256-GCM para Cliente.accesos (credenciales Marangatu/SET/IPS/MITES).
// Regla dura del PRD: solo ADMIN desencripta, siempre server-side.

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY no está configurada");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY debe ser 32 bytes en base64 (openssl rand -base64 32)");
  }
  return key;
}

// Devuelve "iv.tag.ciphertext" en base64
export function encriptar(textoPlano: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const cifrado = Buffer.concat([cipher.update(textoPlano, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${cifrado.toString("base64")}`;
}

export function desencriptar(blob: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Formato de blob cifrado inválido");
  const decipher = createDecipheriv(ALG, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
