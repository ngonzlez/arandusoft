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
MinIO (ya corriendo en tu Coolify): bucket "arandufiles" — PDFs/Excel privados, descarga vía URL firmada
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
| `MINIO_ENDPOINT` | URL completa de tu MinIO (ej. `https://storage.tudominio.com`) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | credenciales de tu MinIO |
| `MINIO_BUCKET` | `arandufiles` — crear el bucket antes desde la consola de MinIO |
| `SUPERADMIN_EMAIL` | correo del proveedor (recibe alertas de licencia) |
| `SUPERADMIN_PASSWORD_HASH` | hash bcrypt — generar: `node -e "require('bcryptjs').hash('CLAVE', 10).then(console.log)"` |
| `ENCRYPTION_KEY` | `openssl rand -base64 32` (32 bytes — cifra los accesos de clientes). **Guardar copia segura: si se pierde, los accesos cifrados son irrecuperables** |
| `CRON_SECRET` | `openssl rand -hex 24` |
| `RESEND_ATTACHMENT_MAX_BYTES` | `8388608` |

> Las features (Módulo Jurídico, Generador de Presupuestos) ya **no** se
> controlan por env var — se prenden/apagan desde `/admin/licencia` (SUPERADMIN)
> y viven en la DB (`Licencia.features`). La vieja `NEXT_PUBLIC_ENABLE_JURIDICO`
> quedó obsoleta, no hace falta cargarla.

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
node prisma/seed.cjs
```

> `seed.cjs` es un bundle auto-suficiente generado en el build (no depende de
> `tsx`, `npx` ni de `npm install` en el contenedor). Toma `SUPERADMIN_EMAIL`,
> `SUPERADMIN_PASSWORD_HASH` y `DATABASE_URL` de las env vars.

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
- [ ] Subir un PDF de prueba a un cliente (verifica MinIO)
- [ ] Enviar ese PDF por correo a otro usuario (verifica Resend + notificación)
- [ ] Cron responde 401 sin header y JSON con header
- [ ] Importar clientes reales por Excel (`/clientes/importar`, plantilla descargable)
- [ ] Borrar clientes de ejemplo del seed
- [ ] SUPERADMIN → `/admin/licencia` → prender las features contratadas por Criterio
      (Módulo Jurídico y/o Generador de Presupuestos)
- [ ] Backups automáticos diarios de la DB activados en Coolify

## 8. Migraciones seguras sobre datos reales (LEER antes de cada actualización)

El contenedor corre **`prisma migrate deploy`** al arrancar — el comando seguro
de producción: solo aplica los archivos ya commiteados en `prisma/migrations/`,
es idempotente y **nunca** resetea ni borra datos por su cuenta. El riesgo no es
el comando: es escribir una migración destructiva. Reglas:

**1. Solo migraciones ADITIVAS.** Antes de commitear un `.sql` nuevo, revisar que
no contenga ninguna de estas líneas sobre tablas con datos reales:
- `DROP TABLE` / `DROP COLUMN`
- `ALTER COLUMN ... SET NOT NULL` sin un `DEFAULT` (falla si ya hay filas)
- renombrar columna/tabla (Prisma lo genera como drop + add → **pierde los datos**)
- cambiar el tipo de una columna

Aditivo y seguro: `CREATE TABLE`, `ADD COLUMN` (NULL o con DEFAULT), `CREATE INDEX`,
nuevo enum o valor de enum. Todas las migraciones actuales del repo son aditivas.

**2. Cambios NO aditivos → patrón expand-contract, en dos deploys.** Ej. renombrar
`x` a `y`: (deploy 1) agregar `y`, copiar `x→y`, empezar a leer/escribir `y`;
(deploy 2, cuando ya está estable) recién ahí `DROP COLUMN x`. Nunca en un solo paso.

**3. NUNCA correr en producción:** `prisma migrate reset` (borra todo),
`prisma migrate dev` (puede resetear), `prisma db push` (aplica sin migración y
puede dropear columnas para "ajustar"). Esos son de desarrollo local. En prod solo
existe `migrate deploy`, que ya corre automático.

**4. Backup ANTES de cada deploy que incluya una migración nueva.** Coolify → la DB
→ Backups → botón de backup manual (además del diario automático). Si algo sale mal,
se restaura desde ahí. Regla práctica: si el deploy trae un `.sql` nuevo, backup manual primero.

**5. Probar la migración localmente contra una copia de los datos reales** antes de
subirla: restaurá el backup de producción en tu Postgres local, corré
`npx prisma migrate deploy`, y verificá que la app arranca y los datos siguen ahí.

**6. Flujo de una actualización con cambio de esquema:**
```
1. En local: editar schema.prisma → npx prisma migrate dev --name <descriptivo>
   (genera el .sql; revisar que sea aditivo)
2. Verificar contra copia de datos reales (punto 5)
3. git commit + push
4. Coolify → backup manual de la DB
5. Coolify → deploy (migrate deploy corre solo al arrancar, aplica solo lo nuevo)
6. Verificar que la app arranca y los datos están intactos
```

**7. Si una migración falla a mitad**, `migrate deploy` marca ese estado y no arranca
la app (falla el CMD). No deja la DB "a medias" de forma silenciosa. Se diagnostica
con `prisma migrate status`, se corrige el `.sql` o se hace
`prisma migrate resolve --rolled-back <nombre>`, y se reintenta. Por eso el backup del
punto 4 es la red de seguridad real.

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
