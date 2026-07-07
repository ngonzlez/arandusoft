# ArandúSoft

Sistema de gestión interna para estudios jurídico-contables. Cliente inicial: **Criterio Asesores S.R.L** (Paraguay).

Stack: Next.js 15 (App Router) · TypeScript strict · Tailwind CSS · PostgreSQL + Prisma 6 · NextAuth v5 · Resend · Cloudinary.

## Documentación

- `PRD.md` — lógica de negocio, módulos, reglas.
- `DESIGN.md` — guía visual inicial (el prototipo en `project/` manda donde difieran).
- `ROADMAP.md` — **registro vivo de avance**: qué se construyó, migraciones, usuarios seed, decisiones por fase.
- `docs/` — assets y documentos originales del handoff.

## Desarrollo local

```bash
cp .env.example .env        # completar valores (ver comentarios en el archivo)
docker compose up -d db     # levanta Postgres local
npm install
npm run db:migrate          # aplica migraciones Prisma
npm run db:seed             # crea SUPERADMIN, ADMIN de prueba, licencia activa, clientes de ejemplo
npm run dev                 # http://localhost:3000
```

Otros comandos:

```bash
npm run db:studio   # Prisma Studio (explorar la DB)
npm run build        # build de producción
```

## Deploy

Ver `docs/DEPLOY.md` (Dockerfile + Coolify) cuando esté disponible — Postgres en producción es un recurso managed separado de Coolify, no el `docker-compose.yml` de este repo (ese es solo para desarrollo local).
