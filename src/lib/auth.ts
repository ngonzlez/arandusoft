import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { permitirIntento, limpiarIntentos } from "@/lib/rate-limit";

const VENTANA_MS = 15 * 60 * 1000;
const MAX_POR_EMAIL = 5; // frena fuerza bruta contra una cuenta puntual
const MAX_POR_IP = 20; // frena a quien prueba muchos emails desde un mismo origen

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const emailNorm = email.toLowerCase().trim();
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";

        // Mismo mensaje genérico que credenciales inválidas — no delatar que
        // existe un límite (evita dar pistas a quien está probando fuerza bruta).
        if (
          !permitirIntento(`email:${emailNorm}`, MAX_POR_EMAIL, VENTANA_MS) ||
          !permitirIntento(`ip:${ip}`, MAX_POR_IP, VENTANA_MS)
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: emailNorm },
        });
        if (!user || !user.activo) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        limpiarIntentos(`email:${emailNorm}`);
        limpiarIntentos(`ip:${ip}`);

        return {
          id: user.id,
          name: user.nombre,
          email: user.email,
          rol: user.rol,
        };
      },
    }),
  ],
});
