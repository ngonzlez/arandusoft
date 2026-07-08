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

---

## Fase 1 — Auth + Roles + Licencia + Layout base (2026-07-07)

**Qué se construyó:**
- **NextAuth v5** con provider Credentials (email+password, bcrypt) y sesión JWT que incluye `id` y `rol` (`src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/types/next-auth.d.ts`).
- **Middleware** (`src/middleware.ts`) edge-safe: exige sesión en toda ruta no pública, aplica control de acceso por rol (`/usuarios` solo ADMIN, `/admin` solo SUPERADMIN, `/expedientes` ADMIN+JURIDICO) y confina al SUPERADMIN a su panel.
- **Chequeo de licencia** (`src/lib/licencia.ts`): cache en memoria TTL 30s; se ejecuta en el layout del dashboard (server component) y en el guard de API (`requireApiSession`). *Decisión técnica:* el middleware de Next corre en Edge runtime donde Prisma no funciona — el chequeo vive en layout + API guard, con el mismo efecto funcional (suspensión efectiva en ≤30s, inmediata al invalidar el cache desde el panel superadmin).
- **Guard de API** (`src/lib/api-auth.ts`): `requireApiSession(roles?)` (401/403 estándar + bloqueo por licencia) y `filtroClientesPorRol()` (regla dura del PRD: CONTABLE ve CONTABLE+AMBOS, JURIDICO ve JURIDICO+AMBOS, ADMIN todo).
- **Kit UI** (`src/components/ui/`): Button, Badge (lookup de `lib/badges.ts` con los pares hex del prototipo), Card/StatTile, Input/Select/Textarea, Avatar (iniciales + color estable), Modal, SlideOver (animado, ancho 440/480), Table, Tabs, Spinner, EmptyState, Toast (provider global).
- **Layout** (`src/components/layout/`): Sidebar con gradiente del prototipo + nav filtrada por rol + badge de notificaciones + usuario/logout; AppShell con drawer mobile (<920px); PageHeader; íconos SVG inline.
- **Login** split-screen (panel marca azul marino + form) con manejo de error y loading.
- **Página `/suspendido`** con mensaje personalizado del proveedor.
- **Dashboard** inicial con StatTiles reales (clientes activos filtrados por rol, tareas pendientes del usuario, vencimientos próximos 7 días) — widgets completos llegan con sus módulos.
- `src/lib/crypto.ts`: AES-256-GCM para `Cliente.accesos` (se usa desde Fase 2).
- `src/lib/format.ts`: guaraníes (`Gs. 9.500.000`), fechas en hora Paraguay (`date-fns-tz`), períodos, iniciales.

**Migraciones:** ninguna nueva (esquema ya creado en Fase 0).

**Usuarios/seed:** sin cambios.

**Env vars nuevas:** ninguna (todas definidas en Fase 0).

**Verificado (curl contra dev server):** login page 200 · `/dashboard` sin sesión → 307 a `/login` · POST credentials → sesión con `rol: ADMIN` · `/dashboard` con sesión → 200 · licencia SUSPENDIDA en DB → `/dashboard` → 307 a `/suspendido` mostrando el mensaje personalizado · licencia reactivada → `/dashboard` 200 de nuevo · `npm run build` limpio.

**Pendiente / notas:** probar visual completo en browser cuando haya más páginas. Próxima fase: Módulo Clientes.

---

## Fase 2 — Módulo Clientes (2026-07-07)

**Qué se construyó:**
- **API** `GET/POST /api/clientes` y `GET/PATCH/DELETE /api/clientes/[id]`: CRUD completo con filtro por rol en cada query, validación de RUC (formato paraguayo laxo) y RUC único, soft delete (DELETE = estado INACTIVO, solo ADMIN), sincronización de obligaciones (activa/desactiva `ClienteObligacion`, nunca borra).
- **Accesos internos** (Marangatu/SET/IPS/MITES/otros): se guardan cifrados AES-256-GCM en `Cliente.accesos`; solo ADMIN los envía/recibe — el campo jamás aparece en respuestas para CONTABLE/JURIDICO (se excluye vía `select` explícito en lista y se separa del objeto en detalle).
- **API** `GET /api/usuarios`: lista liviana (activos, sin SUPERADMIN) para selects de responsable — el CRUD completo llega en Fase 10.
- **UI** `/clientes`: lista server-rendered con búsqueda debounced por nombre/RUC (searchParams), chips de filtro por tipo (solo ADMIN los ve) y estado, badges con los colores del prototipo, avatar del responsable.
- **UI** `/clientes/nuevo` y `/clientes/[id]/editar`: formulario completo (datos generales, obligaciones como checkboxes estilo chip, panel de accesos solo-ADMIN con usuario/clave por sistema).
- **UI** `/clientes/[id]`: detalle con tabs (Resumen activo; Estado Mensual/Declaraciones/Vencimientos/Tareas como placeholder hasta sus fases), panel de accesos con claves ocultas por defecto ("Ver clave" por clic), badges de tipo/estado/estado fiscal.
- **Auditoría:** campo `Cliente.actualizadoPor` (userId) se setea en cada create/update/delete.

**Migraciones:**
- `20260707235252_cliente_auditoria` — agrega `Cliente.actualizadoPor String?`.

**Usuarios/seed:** se agregó a mano en DB local un usuario de prueba `contable@criterioasesores.com.py` (rol CONTABLE, password local `cambiar123`) para verificar la separación de roles. No forma parte del seed — recrear si se resetea la DB.

**Env vars nuevas:** ninguna.

**Verificado (curl, dos sesiones simultáneas ADMIN y CONTABLE):**
1. Cliente tipo JURIDICO creado por ADMIN no aparece en la lista del CONTABLE.
2. GET directo del detalle jurídico como CONTABLE → 404.
3. ADMIN ve `accesos` desencriptados en el detalle.
4. En la DB el campo `accesos` está cifrado (el texto plano no aparece).
5. Ninguna respuesta para CONTABLE contiene el campo `accesos`.
6. `actualizadoPor` queda registrado con el userId del ADMIN.
7. `npm run build` limpio.

**Nota técnica:** tras una migración con el dev server corriendo, hay que reiniciarlo y si persiste el error de "Unknown argument" borrar `.next` (bundle cachea el cliente Prisma viejo).

**Pendiente / notas:** próxima fase: Estado Mensual (checklist).

---

## Fase 3 — Estado Mensual (2026-07-08)

**Qué se construyó:**
- **API** `GET /api/estado-mensual?mes=AAAA-MM`: matriz global del mes (clientes activos visibles por rol × obligaciones activas × estado registrado). Solo ADMIN/CONTABLE.
- **API** `PATCH /api/estado-mensual`: upsert de una celda `{clienteId, mes, obligacion, estado}` con auditoría (`responsableId` = usuario que tilda + `fechaPresentacion` automática al marcar PRESENTADO).
- **Estado fiscal automático:** al tildar, si el cliente tiene alguna obligación VENCIDO → pasa a ATRASADO; si ya no tiene vencidas → AL_DIA. Los estados CCT y VECTOR_FISCAL son manuales y el automático nunca los pisa.
- **UI** `/estado-mensual`: tabla global clientes × obligaciones con semáforo (✓ verde presentado, ⏳ amarillo pendiente, ✕ rojo vencido, — gris no aplica; punto tenue si la obligación no aplica al cliente), selector de mes ‹ › , columna de cliente sticky con scroll horizontal. Clic en celda → modal con estado actual, quién/cuándo presentó, y botones para cambiar estado.
- **Ficha del cliente:** el tab "Estado Mensual" ahora muestra la misma tabla filtrada a ese cliente (mes actual).

**Migraciones:** ninguna nueva.

**Usuarios/seed:** sin cambios.

**Env vars nuevas:** ninguna.

**Verificado (curl como CONTABLE):** GET matriz devuelve solo clientes CONTABLE/AMBOS · PATCH tilda IVA como PRESENTADO y registra `responsableId` + `fechaPresentacion` · marcar IPS VENCIDO pone al cliente ATRASADO · volver a PRESENTADO lo devuelve a AL_DIA · build limpio.

**Pendiente / notas:** el adjuntar PDF desde el modal se conecta en Fase 4 (campo `declaracionId` ya existe en `EstadoMensual`). Próxima fase: Declaraciones + envío de archivos por correo interno.

---

## Fase 4 — Declaraciones + Envío por correo interno (2026-07-08)

**Qué se construyó:**
- **`lib/storage.ts`** (Cloudinary): PDFs se suben como recurso `raw` **privado**; descarga siempre vía URL firmada con expiración (10 min descarga directa, 48h para links por email).
- **`lib/email.ts`** (Resend): cliente + plantilla HTML con identidad ArandúSoft (header azul marino + dorado).
- **`lib/notificaciones.ts`**: helper central `crearNotificacion()` — todos los módulos lo usan de acá en más.
- **API** `POST /api/declaraciones`: subida multipart (PDF only, máx 15MB), guarda tipo/período/tamaño/nombre original/`cargadoPor`; checkbox opcional "vincular" que tilda automáticamente la obligación del período en Estado Mensual (con `declaracionId` linkeado).
- **API** `GET /api/clientes/[id]/declaraciones`: separadas en `recientes` e `historial` (>6 meses, computado por fecha — nunca se borra nada).
- **API** `GET /api/declaraciones/[id]/descargar`: valida visibilidad por rol → redirect a URL firmada (descarga 1 clic).
- **API** `POST /api/archivos/enviar` + **`lib/email-archivos.ts`** (módulo nuevo pedido fuera de los .md): envía una declaración por correo a otro usuario interno. Si el PDF ≤ `RESEND_ATTACHMENT_MAX_BYTES` (default 8MB) va **adjunto**; si es más grande va como **link firmado 48h**. `reply_to` = correo del remitente. **Auditoría total:** cada intento (éxito o fallo) queda en `EnvioArchivo` con método, destinatario snapshot, `resendMessageId` o `errorMensaje`. Al destinatario le llega también notificación in-app `ARCHIVO_RECIBIDO`.
- **UI**: tab Declaraciones en la ficha del cliente — tabla tipo/período/fecha/cargado por + botones Descargar y ✉ Enviar por fila, modal de subida (con vinculación a Estado Mensual), sección Historial colapsable, `EnviarArchivoModal` compartido (reutilizable para documentos de expedientes en Fase 2 jurídica).

**Migraciones:** ninguna nueva.

**Usuarios/seed:** sin cambios.

**Env vars nuevas:** ninguna nueva (usa `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_ATTACHMENT_MAX_BYTES` ya definidas en Fase 0 — **siguen vacías en dev**).

**Verificado (curl):** GET declaraciones OK · POST sin archivo → 400 claro · POST con .txt → "Solo se aceptan archivos PDF" · POST PDF sin credenciales Cloudinary → error 500 limpio y amigable (no crash) · enviarse archivo a uno mismo → 400 · build limpio.

**Pendiente / notas:** ⚠️ la subida real a Cloudinary y el envío real por Resend quedan pendientes de probar cuando se carguen las credenciales (`CLOUDINARY_*`, `RESEND_API_KEY`) — el flujo completo está implementado. Próxima fase: Calendario de Vencimientos.
