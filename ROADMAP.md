# ROADMAP — ArandúSoft

Registro vivo de avance del proyecto. Cada fase agrega una entrada acá al cerrarse (migraciones corridas, usuarios/seed creados, env vars nuevas, decisiones tomadas). Ver plan completo de fases en `PRD.md` / plan de implementación.

---

## Fase 0 — Setup base (2026-07-07)

**Qué se construyó:**
- Scaffold Next.js + TypeScript strict + Tailwind CSS + App Router en la raíz del repo (docs originales `PRD.md`, `DESIGN.md`, `CLAUDE.md`, `Presupuesto_CriterioAsesores.pdf`, `project/` y el handoff de Claude Design se preservaron; assets de marca movidos a `public/brand/` y `docs/`).
- `tailwind.config.ts` con la paleta real del prototipo (`primary #1A2C4E`, `gold #C9A84C`, `surface #EEF1F5`, etc.), breakpoint `lg: 920px`, radios `card`/`control`.
- Tipografía Poppins+Inter vía `next/font/google` en `src/app/layout.tsx`.
- Ícono de la app (`src/app/icon.png`) con el isotipo real de ArandúSoft.
- Esquema Prisma completo (`prisma/schema.prisma`) con todos los modelos de Fase 1 + `Expediente`/`Documento`/`HistorialExpediente` ya listos para Fase 2 (jurídico), y el módulo nuevo `EnvioArchivo` (envío de archivos por correo interno).
- `prisma/seed.ts`: crea SUPERADMIN (desde env), 1 ADMIN de prueba, 1 Licencia activa (vence a 30 días), 4 clientes de ejemplo con sus obligaciones.
- `docker-compose.yml` para Postgres local (uso solo en desarrollo — en Coolify Postgres es un recurso managed separado).
- `.env.example` con todas las variables necesarias.

**Migraciones:**
- `20260707211648_init` — esquema inicial completo (todos los modelos).

**Usuarios/seed (local dev):**
- `superadmin@arandusoft.dev` (SUPERADMIN) — password hasheado desde `SUPERADMIN_PASSWORD_HASH` en `.env` (valor local de desarrollo: `cambiar-esta-clave-2026`, **cambiar en producción**).
- `admin@criterioasesores.com.py` (ADMIN) — password local de desarrollo: `cambiar123`, **cambiar en producción**.
- 4 clientes de ejemplo: Plastisur EAS, Villalba y Asociados, Distribuidora San Roque S.A., Comercial Ñandutí S.R.L.

**Env vars nuevas:** todas las de `.env.example` (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `CLOUDINARY_*`, `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD_HASH`, `ENCRYPTION_KEY`, `CRON_SECRET`, `RESEND_ATTACHMENT_MAX_BYTES`, `NEXT_PUBLIC_ENABLE_JURIDICO`).

**Decisiones (desvíos del plan original, por seguridad/estabilidad):**
- **Next.js 15.5.20** (línea `backport`, con parches de seguridad activos), no Next 14. La línea 14.x quedó congelada en `14.2.35` sin más backports de seguridad — tiene varios CVE altos (DoS en Image Optimizer, cache poisoning, XSS) sin fix disponible en esa major. Se evitó saltar directo a Next 16 (React 19/Tailwind v4 muy recientes, menor certeza de compatibilidad con NextAuth v5 en este momento). App Router, Tailwind, Prisma, NextAuth v5 — sin cambios de arquitectura respecto al plan.
- **Prisma 6.19.3**, no Prisma 7.x. Prisma 7 elimina el patrón clásico `url = env("DATABASE_URL")` en `schema.prisma` y exige `prisma.config.ts` + un driver adapter (`@prisma/adapter-pg` u otro) pasado al `PrismaClient`. Es un cambio de arquitectura no trivial que no aporta nada al alcance pedido; 6.19.3 mantiene el patrón simple que asume el resto del plan (Docker `prisma migrate deploy` en el entrypoint funciona tal cual).
- **exceljs en vez de xlsx** para el importador de Excel (Fase 9). El paquete `xlsx` de SheetJS tiene 2 CVE (prototype pollution + ReDoS) sin fix publicado en el registro de npm. `exceljs` no tiene vulnerabilidades sin parchear conocidas.
- `prisma` (CLI) vive en `devDependencies`, solo `@prisma/client` es dependencia de runtime — es lo correcto para el tamaño de la imagen Docker final.

**Verificado:** `docker compose up -d db` levanta Postgres local → `npx prisma migrate dev --name init` aplica el esquema completo sin errores → `npm run db:seed` crea usuarios/licencia/clientes → `npm run build` compila sin errores con TypeScript strict.

**Pendiente / notas:** confirmar con el cliente si las credenciales de Resend/Cloudinary ya están disponibles antes de Fase 4 (Declaraciones + envío de correo). El plan completo de fases está en el plan de implementación aprobado; próxima fase: Auth + Roles + Middleware + Layout base.
