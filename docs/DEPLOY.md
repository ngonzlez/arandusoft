# DEPLOY — ArandúSoft en Coolify (Hetzner + Cloudflare)

Guía paso a paso para desplegar `panel.criterioasesores.com.py`.

## Arquitectura

```
GitHub (ngonzlez/arandusoft, branch main)
        │  push → build automático
        ▼
Coolify (Hetzner)
├── App ArandúSoft  ← este repo, build por Dockerfile
└── PostgreSQL 16   ← recurso managed SEPARADO de Coolify (no docker-compose)
        ▲
Cloudflare DNS: panel.criterioasesores.com.py → IP Hetzner
Resend: SPF/DKIM/DMARC en la zona criterioasesores.com.py
Cloudinary: PDFs de declaraciones (recurso raw privado)
cron-job.org (o Coolify Scheduled Task): GET /api/cron/daily diario 12:00 UTC
```

## 1. Base de datos (Coolify)

1. Coolify → **+ New → Database → PostgreSQL 16**.
2. Nombre: `arandusoft-db`. Guardar el `DATABASE_URL` interno que genera (formato `postgresql://user:pass@host:5432/db`).
3. Activar **backups automáticos** (Coolify → la DB → Backups → diario).

> El `docker-compose.yml` del repo es **solo para desarrollo local** — no se usa en producción.

## 2. Aplicación (Coolify)

1. **+ New → Application → Public Repository** (o conectar GitHub App para auto-deploy en push).
   - Repo: `https://github.com/ngonzlez/arandusoft`, branch `main`.
   - Build Pack: **Dockerfile** (lo detecta en la raíz).
   - Puerto: **3000**.
2. **Variables de entorno** (Coolify → app → Environment Variables):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | el del recurso Postgres de Coolify (paso 1) |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` (uno NUEVO, no el de dev) |
| `NEXTAUTH_URL` | `https://panel.criterioasesores.com.py` |
| `AUTH_TRUST_HOST` | `true` (necesario detrás del proxy de Coolify) |
| `RESEND_API_KEY` | API key de Resend |
| `EMAIL_FROM` | `no-reply@criterioasesores.com.py` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | del dashboard de Cloudinary |
| `SUPERADMIN_EMAIL` | correo del proveedor (recibe alertas de licencia) |
| `SUPERADMIN_PASSWORD_HASH` | hash bcrypt — generar: `node -e "require('bcryptjs').hash('CLAVE', 10).then(console.log)"` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` (32 bytes — cifra los accesos de clientes). **Guardar copia segura: si se pierde, los accesos cifrados son irrecuperables** |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `RESEND_ATTACHMENT_MAX_BYTES` | `8388608` |
| `NEXT_PUBLIC_ENABLE_JURIDICO` | `false` (cambiar a `true` al lanzar Fase 2) |

3. **Dominio**: Coolify → app → Domains → `https://panel.criterioasesores.com.py` (Coolify emite el certificado Let's Encrypt automáticamente si el DNS ya apunta).
4. **Deploy**. Las migraciones Prisma corren solas en cada arranque (`prisma migrate deploy` en el CMD del Dockerfile — idempotente).

## 3. DNS (Cloudflare)

En la zona `criterioasesores.com.py`:

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| A | `panel` | IP del Hetzner | ⚠️ **DNS only (nube gris)** al menos hasta que Coolify emita el certificado; después se puede activar el proxy |

## 4. Email (Resend + Cloudflare)

1. Resend → Domains → Add `criterioasesores.com.py`.
2. Copiar los registros que pide (TXT SPF, CNAME/TXT DKIM, y opcional DMARC) a la zona de Cloudflare (DNS only).
3. Esperar verificación en Resend. Sin esto los correos van a spam o no salen.

## 5. Seed inicial (una sola vez)

Desde la terminal de la app en Coolify (o localmente apuntando `DATABASE_URL` a producción):

```bash
node_modules/.bin/prisma db seed   # si falla, correr: npx tsx prisma/seed.ts
```

Crea: SUPERADMIN (desde env), ADMIN de prueba (`admin@criterioasesores.com.py` / `cambiar123` — **cambiar la contraseña de inmediato** desde /usuarios), licencia activa 30 días y clientes de ejemplo (borrarlos antes de la carga real, o directamente importar los reales por Excel).

## 6. Cron diario

Programar un GET diario a las **12:00 UTC** (= 08:00 Paraguay, sin horario de verano):

- **Opción A — Coolify Scheduled Task** (si tu versión lo tiene): comando
  `curl -s -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/daily`
- **Opción B — cron-job.org** (gratis, con historial de ejecuciones):
  URL `https://panel.criterioasesores.com.py/api/cron/daily`, método GET,
  header `x-cron-secret: <CRON_SECRET>`, diario 12:00 UTC.

Verificar: la respuesta es JSON `{"data":{"alertas7d":...}}`; sin el header devuelve 401.

## 7. Checklist post-deploy

- [ ] `https://panel.criterioasesores.com.py/login` carga con el diseño correcto
- [ ] Login ADMIN funciona; cambiar contraseña del admin de prueba
- [ ] Login SUPERADMIN → cae en `/admin/licencia`
- [ ] Suspender desde el panel → usuarios ven `/suspendido` → reactivar
- [ ] Subir un PDF de prueba a un cliente (verifica Cloudinary)
- [ ] Enviar ese PDF por correo a otro usuario (verifica Resend + notificación)
- [ ] Cron responde 401 sin header y JSON con header
- [ ] Importar clientes reales por Excel (`/clientes/importar`, plantilla descargable)
- [ ] Borrar clientes de ejemplo del seed

## Desarrollo local (referencia)

```bash
cp .env.example .env      # completar
docker compose up -d db   # Postgres local
npm install && npm run db:migrate && npm run db:seed && npm run dev
```

## Probar la imagen de producción localmente

```bash
docker build -t arandusoft:local .
docker run --rm -p 3000:3000 --env-file .env \
  -e DATABASE_URL="postgresql://arandusoft:arandusoft@host.docker.internal:5432/arandusoft" \
  arandusoft:local
```
