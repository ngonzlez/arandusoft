# CLAUDE.md — Instrucciones para Claude Code
## Sistema de Gestión Interna — Criterio Asesores S.R.L

Lee este archivo antes de hacer cualquier cosa. Es tu guía principal.

---

## Contexto del proyecto

Estás construyendo un sistema web de gestión interna para un estudio jurídico-contable en Paraguay. El cliente tiene 5-6 personas en su equipo y actualmente usa hojas físicas y Excel para gestionar sus clientes, vencimientos y declaraciones impositivas.

Los archivos de referencia son:
- `PRD.md` → lógica del negocio, módulos, base de datos, API routes
- `DESIGN.md` → colores, componentes, layouts, estructura de carpetas

Lee ambos archivos completos antes de escribir una sola línea de código.

---

## Stack obligatorio

```
Framework:     Next.js 14+ con App Router (no Pages Router)
Estilos:       Tailwind CSS (no CSS modules, no styled-components)
Base de datos: PostgreSQL + Prisma ORM
Auth:          NextAuth.js v5
Email:         Resend
Storage PDF:   Cloudinary
Lenguaje:      TypeScript estricto (strict: true en tsconfig)
```

No uses otras librerías sin consultar. Si necesitás algo extra, usá lo que ya está en el stack.

---

## Orden de desarrollo

Seguí este orden estrictamente. No avances al siguiente paso sin terminar el anterior.

### Paso 1 — Setup base
- [ ] Inicializar proyecto Next.js 14 con TypeScript y Tailwind
- [ ] Configurar Prisma con PostgreSQL
- [ ] Crear esquema Prisma completo (ver PRD.md sección 4)
- [ ] Configurar NextAuth con roles (ADMIN, CONTABLE, JURIDICO, SUPERADMIN)
- [ ] Crear middleware de control de roles y suspensión de licencia
- [ ] Crear layout base: sidebar + topbar (ver DESIGN.md sección 2)
- [ ] Crear pantalla de login
- [ ] Crear pantalla `/suspendido`

### Paso 2 — Módulo Clientes
- [ ] Página `/clientes` — lista con búsqueda y filtros
- [ ] Página `/clientes/[id]` — detalle con tabs
- [ ] Formulario crear/editar cliente con todos los campos del PRD
- [ ] Campos de accesos (Marangatu, IPS, etc.) — solo visibles para ADMIN
- [ ] Badges de estado fiscal

### Paso 3 — Estado Mensual
- [ ] Página `/estado-mensual` — tabla global clientes × obligaciones
- [ ] Vista por mes (selector de mes)
- [ ] Modal para tildar obligación + adjuntar PDF
- [ ] Registro de quién tiló y cuándo

### Paso 4 — Declaraciones
- [ ] Subida de PDF a Cloudinary
- [ ] Lista de declaraciones por cliente
- [ ] Descarga directa con 1 clic
- [ ] Lógica de archivado automático a los 6 meses

### Paso 5 — Calendario de Vencimientos
- [ ] Lógica de cálculo automático por terminación de RUC (ver PRD sección 3.6)
- [ ] Vista calendario mensual
- [ ] Lista de próximos vencimientos (sidebar dashboard)
- [ ] Sistema de alertas: 7 días / 3 días / día del vencimiento

### Paso 6 — Dashboard
- [ ] Widgets de resumen (tareas, expedientes, vencimientos, clientes)
- [ ] Feed de actividad reciente
- [ ] Panel de notificaciones no leídas

### Paso 7 — Asambleas
- [ ] Tabla de calendario de prioridades
- [ ] Tildado interactivo por cliente y columna
- [ ] Vista filtrada por mes

### Paso 8 — Tareas
- [ ] CRUD de tareas con checklist interno
- [ ] Vista Kanban (Pendiente / En progreso / Completada)
- [ ] Vista lista ordenada por prioridad

### Paso 9 — Notificaciones
- [ ] Sistema in-app: campana + panel
- [ ] Envío de emails con Resend
- [ ] Cron job diario para alertas de vencimientos

### Paso 10 — Importación Excel
- [ ] Subida de archivo .xlsx
- [ ] Preview con validación
- [ ] Confirmación e importación masiva

### Paso 11 — Usuarios y roles
- [ ] Gestión de usuarios (alta, baja, asignación de rol)
- [ ] Correos corporativos por usuario

### Paso 12 — Panel Superadmin (oculto)
- [ ] Ruta `/admin/licencia` — separada del sistema principal
- [ ] Botón suspender / reactivar
- [ ] Registro de pagos
- [ ] Alertas automáticas al proveedor

---

## Reglas que nunca debes romper

### Separación de roles
```typescript
// CONTABLE nunca ve datos de clientes JURIDICO y viceversa
// Filtrar SIEMPRE por tipo de cliente según el rol del usuario logueado

// En toda query de clientes:
where: {
  tipo: session.user.rol === 'CONTABLE'
    ? { in: ['CONTABLE', 'AMBOS'] }
    : session.user.rol === 'JURIDICO'
    ? { in: ['JURIDICO', 'AMBOS'] }
    : undefined // ADMIN ve todo
}
```

### Auditoría obligatoria
Cada acción que modifique datos debe registrar `userId + timestamp`. No hay excepciones.

### Suspensión de licencia
El middleware debe verificar el estado de la licencia en CADA request antes de cualquier otra cosa. Si está suspendida → redirigir a `/suspendido`.

### Accesos de clientes
Los campos `accesos` (Marangatu, SET, IPS, etc.) son JSON encriptado. Solo el rol `ADMIN` puede verlos. El campo no debe aparecer en ninguna respuesta de API para roles `CONTABLE` o `JURIDICO`.

### Fechas
- Guardar siempre en UTC en la base de datos
- Mostrar siempre en hora Paraguay (UTC-4)
- Usar `date-fns-tz` para conversiones

### Moneda
Siempre formatear guaraníes así: `Gs. 9.500.000` (punto como separador de miles, nunca coma).

---

## Componentes UI base a crear primero

Antes de construir páginas, creá estos componentes en `/components/ui/`:

```
Button.tsx        → variantes: primary, secondary, outline, danger, ghost
Badge.tsx         → variantes por estado (ver DESIGN.md sección 3)
Card.tsx          → contenedor base con sombra
Input.tsx         → con label, error y helper text
Modal.tsx         → overlay con backdrop
Table.tsx         → tabla con header oscuro y filas alternadas
Tabs.tsx          → para el detalle del cliente
Spinner.tsx       → loading state
EmptyState.tsx    → cuando no hay datos
```

Usá exactamente los colores del DESIGN.md. No inventes colores nuevos.

---

## Lógica de negocio crítica

### Cálculo de vencimientos por RUC

```typescript
// lib/vencimientos.ts

const CALENDARIO_DNIT: Record<string, number> = {
  '0': 7,  '1': 9,  '2': 11, '3': 13, '4': 15,
  '5': 17, '6': 19, '7': 21, '8': 23, '9': 25
}

export function calcularVencimientoIVA(ruc: string, año: number, mes: number): Date {
  const terminacion = ruc.slice(-1)
  const dia = CALENDARIO_DNIT[terminacion]
  // El vencimiento es el día X del mes SIGUIENTE al período
  return new Date(año, mes, dia) // mes es 0-indexed en JS
}
```

### Archivado de declaraciones

```typescript
// Una declaración se considera "archivada" cuando:
// createdAt < hoy - 6 meses
// No se elimina, solo cambia su visualización
const seisAntras = subMonths(new Date(), 6)
const archivadas = declaraciones.filter(d => d.createdAt < seisAntras)
const recientes  = declaraciones.filter(d => d.createdAt >= seisAntras)
```

---

## Estructura de respuesta API

```typescript
// Éxito
return NextResponse.json({ data: result }, { status: 200 })

// Error de validación
return NextResponse.json({ error: 'Mensaje claro', code: 'VALIDATION_ERROR' }, { status: 400 })

// No autorizado
return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

// No encontrado
return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

// Error del servidor
return NextResponse.json({ error: 'Error interno' }, { status: 500 })
```

---

## Variables de entorno necesarias

Crear `.env.local` con:

```env
# Base de datos
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="genera-uno-con-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Email (Resend)
RESEND_API_KEY=""
EMAIL_FROM="no-reply@criterioasesores.com.py"

# Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Superadmin (NO exponer al cliente)
SUPERADMIN_EMAIL=""
SUPERADMIN_PASSWORD_HASH=""
```

---

## Comandos útiles

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma después de cambiar el schema
npx prisma generate

# Aplicar migraciones en desarrollo
npx prisma migrate dev --name nombre_migracion

# Abrir Prisma Studio para ver la BD
npx prisma studio

# Crear usuario superadmin (correr una sola vez)
npx ts-node scripts/seed-superadmin.ts

# Build de producción
npm run build
```

---

## Seed inicial

Crear `prisma/seed.ts` con:
- 1 usuario SUPERADMIN (credenciales desde .env)
- 1 usuario ADMIN de prueba para Criterio Asesores
- 1 licencia activa con vencimiento a 30 días
- 3-4 clientes de ejemplo con sus obligaciones

---

## Notas finales

- **No** integres con Marangatu ni Judisoft. No tienen API pública.
- **No** borres datos. Siempre soft delete (`activo: false` o `archivado: true`).
- **Sí** mostrá siempre estados de carga (skeleton o spinner) mientras cargan datos.
- **Sí** mostrá mensajes de error claros al usuario, nunca errores técnicos crudos.
- El módulo jurídico es **Fase 2** — no lo construyas hasta que la Fase 1 esté completa y aprobada.
- Ante cualquier duda sobre el flujo de negocio, consultá el PRD.md. Si no está en el PRD, preguntá antes de inventar.

