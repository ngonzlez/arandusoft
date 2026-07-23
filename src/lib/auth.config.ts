import type { NextAuthConfig } from "next-auth";
import type { Rol } from "@prisma/client";

// Config edge-safe: sin Prisma. La usa el middleware.
// El provider Credentials completo (con DB) vive en auth.ts.

const RUTAS_POR_ROL: Record<string, Rol[]> = {
  "/admin": ["SUPERADMIN"],
  "/usuarios": ["ADMIN"],
  "/expedientes": ["ADMIN", "JURIDICO"],
};

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.rol = token.rol;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      const esPublica =
        pathname === "/login" ||
        pathname === "/suspendido" ||
        pathname === "/" ||
        pathname.startsWith("/r/"); // reportes públicos de expedientes (token)
      if (esPublica) return true;

      if (!user) return false; // NextAuth redirige a /login

      for (const [prefijo, roles] of Object.entries(RUTAS_POR_ROL)) {
        if (pathname.startsWith(prefijo) && !roles.includes(user.rol)) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
      }

      // SUPERADMIN solo opera su panel — no navega el sistema del cliente
      if (user.rol === "SUPERADMIN" && !pathname.startsWith("/admin")) {
        return Response.redirect(new URL("/admin/licencia", request.nextUrl));
      }

      return true;
    },
  },
  providers: [], // se completan en auth.ts
};
