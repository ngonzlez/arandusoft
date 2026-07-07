import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge runtime: solo sesión/roles vía JWT. El chequeo de licencia
// (requiere Prisma) vive en el layout del dashboard y en requireApiSession().
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|brand).*)"],
};
