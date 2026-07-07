# PRD — Sistema de Gestión Interna
## Criterio Asesores S.R.L

**Stack:** Next.js 14+ · PostgreSQL · Prisma · Tailwind CSS · NextAuth.js  
**Dominio:** panel.criterioasesores.com.py  
**Entrega:** 20 días desde el inicio  

---

## 1. Contexto

Criterio Asesores es un estudio jurídico-contable de 5–6 personas en Paraguay. Actualmente gestionan clientes, vencimientos y declaraciones de forma manual (hojas físicas, Excel, WhatsApp). Este sistema reemplaza ese flujo con una plataforma web centralizada, hecha exactamente para su operativa.

---

## 2. Roles

| Rol | Acceso |
|---|---|
| `ADMIN` | Todo: clientes contables y jurídicos, credenciales, configuración, usuarios |
| `CONTABLE` | Solo clientes y módulos contables (IVA, IRE, IPS, MITES, EEFF, etc.) |
| `JURIDICO` | Solo expedientes y módulos judiciales |
| `SUPERADMIN` | Panel independiente del desarrollador — control de licencia (oculto al cliente) |

Separación estricta: un usuario CONTABLE nunca ve datos de un cliente JURIDICO y viceversa.  
Cada acción queda registrada con `userId + timestamp`.

---

## 3. Módulos

### 3.1 Autenticación
- Login con email + contraseña (NextAuth.js + JWT)
- Sesión persistente con refresh token
- Pantalla de "Acceso suspendido" cuando la licencia está inactiva
- Recuperación de contraseña por email

---

### 3.2 Dashboard
Pantalla de inicio personalizada por rol.

**Widgets:**
- Tarjetas: tareas pendientes / expedientes activos / vencimientos próximos / clientes activos
- Calendario semanal con próximos vencimientos (resaltados por urgencia)
- Feed de actividad reciente del equipo: `"Karina actualizó IVA de Plastisur EAS"`
- Panel de notificaciones no leídas

---

### 3.3 Clientes

**Ficha del cliente contable:**
```
- Nombre / Razón Social
- RUC
- Cédula
- Teléfono / Correo / Dirección
- Responsable interno asignado
- Tipo: CONTABLE | JURIDICO | AMBOS
- Estado: ACTIVO | INACTIVO | PROSPECTO
- Accesos internos (solo ADMIN):
    · Usuario + clave Marangatu
    · Usuario SET
    · Usuario IPS
    · Usuario MITES
    · Otros
- Obligaciones activas (checkboxes):
    · IVA · IRE SIMPLE · IRE GENERAL · IRP
    · Estados Financieros · Auditoría Externa
    · IDU · IUID · Asamblea
    · IPS · MITES · Reg. Mensual Comprobantes
- Estado fiscal: AL_DIA | ATRASADO | CCT | VECTOR_FISCAL
```

**Acciones:**
- Crear / editar / desactivar cliente (soft delete)
- Buscar y filtrar por tipo, estado, responsable
- Ver todas las declaraciones del cliente
- Ver todos los vencimientos del cliente
- Ver tareas vinculadas

---

### 3.4 Estado Mensual (Checklist)

Vista por cliente + mes. Replica exactamente la hoja física del estudio.

**Por cada obligación activa del cliente:**
```
Obligación | Estado | Fecha presentación | Responsable | Acción
IVA        | ✅ Presentado | 13/06/2026 | Karina | [Ver PDF]
IRE        | ⏳ Pendiente  | —          | —      | [Tildar]
IPS        | ❌ Vencido    | —          | —      | [Tildar]
```

**Estados posibles:** `PENDIENTE` · `PRESENTADO` · `VENCIDO` · `NO_APLICA`

Al tildar como `PRESENTADO`:
- Se registra `userId + timestamp`
- Se puede adjuntar PDF opcionalemente
- Se actualiza el estado fiscal del cliente

**Vista global:** tabla de todos los clientes × todas sus obligaciones del mes. Semáforo visual (verde / amarillo / rojo).

---

### 3.5 Declaraciones Juradas (Archivos)

Por cada cliente, sección de archivos de declaraciones.

**Campos por declaración:**
```typescript
{
  clienteId: string
  tipo: 'IVA' | 'IRE' | 'IRP' | 'EEFF' | 'IDU' | 'IUID' | 'IPS' | 'MITES' | 'OTRO'
  periodo: string        // ej: "junio-2026"
  fechaPresentacion: Date
  archivoUrl: string     // S3 / Cloudinary
  cargadoPor: userId
  createdAt: Date
}
```

**Lógica de archivado:**
- Declaraciones con más de 6 meses → se mueven a sección "Historial"
- No se eliminan — solo cambian de vista
- El historial es accesible en todo momento

**Flujo de uso esperado:**
> Cliente llama → se abre su perfil → se busca por tipo → descarga en 1 clic

---

### 3.6 Calendario de Vencimientos

**Calendario perpetuo DNIT por RUC:**

| Terminación RUC/CI | Fecha vencimiento IVA |
|---|---|
| 0 | Día 7 del mes siguiente |
| 1 | Día 9 |
| 2 | Día 11 |
| 3 | Día 13 |
| 4 | Día 15 |
| 5 | Día 17 |
| 6 | Día 19 |
| 7 | Día 21 |
| 8 | Día 23 |
| 9 | Día 25 |

El sistema calcula automáticamente los próximos vencimientos de cada cliente según su RUC.

**Tipos de vencimiento:**
- `IVA` · `IRE` · `IRP` · `EEFF` · `IDU` · `IUID` · `IPS` · `MITES`
- `REG_MENSUAL_COMPROBANTES`
- `ASAMBLEA` · `RENOVACION_CONTRATO`
- `PLAZO_PROCESAL` (módulo jurídico)

**Alertas automáticas:**
```
7 días antes  → notificación en sistema para el responsable
3 días antes  → notificación en sistema + email
Día del venc. → alerta roja en dashboard + email urgente
```

**Vistas:**
- Calendario mensual visual
- Lista de próximos 7 días (sidebar del dashboard)
- Filtros: por cliente / por tipo / por responsable

---

### 3.7 Calendario de Asambleas y Prioridades

Réplica digital exacta de la hoja "Calendario de Prioridades" del estudio.

**Estructura:**
```
Cliente | Fecha EEFF | Asamblea Solicitada | Confirmada | IDU | MTTES | Reg.Adm | IPS | Libros | Cont.Adm
```

Cada celda es un checkbox tildable. Al tildar: registra usuario + fecha.  
Vista de tabla con todos los clientes activos.

---

### 3.8 Importación desde Excel

**Entidades importables:**
- Clientes (nombre, RUC, cédula, correo, teléfono, obligaciones)
- Declaraciones históricas (tipo, período, fecha)
- Vencimientos existentes

**Flujo:**
1. Subir archivo `.xlsx` o `.csv`
2. Sistema muestra preview con validación de errores
3. Usuario confirma → se importa
4. Reporte de filas importadas / filas con error

**Plantillas descargables** desde el sistema para que el estudio prepare sus Excel.

---

### 3.9 Tareas Internas

**Campos:**
```typescript
{
  titulo: string
  descripcion?: string
  clienteId?: string       // vinculada a un cliente (opcional)
  responsableId: userId
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA'
  fechaLimite: Date
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA'
  checklist: ChecklistItem[]
  notas: Nota[]
}
```

**Checklist items:** lista de subtareas tildables dentro de la tarea.  
Ejemplo real del estudio:
```
☑ Cliente envió comprobantes
☑ Se procesó liquidación IVA  
☐ Presentar IDU
☐ Solicitar MITES
```

**Vistas:** Kanban (por estado) + Lista (por prioridad/fecha)

---

### 3.10 Notificaciones

**Tipos:**
```
VENCIMIENTO_PROXIMO   → 7/3/1 días antes de un vencimiento
TAREA_ASIGNADA        → cuando se le asigna una tarea
TAREA_VENCIDA         → tarea con fecha límite superada
EXPEDIENTE_ACTUALIZADO→ alguien actualizó un expediente
DECLARACION_FALTANTE  → cliente sin declaración X días antes del vencimiento
```

**Canales:**
- In-app: campana con contador, panel con historial 30 días
- Email: configurable por el ADMIN (qué tipos envían email)

**Emails:** Resend · plantilla HTML simple · desde `no-reply@criterioasesores.com.py`

---

### 3.11 Gestión de Usuarios

- Alta / baja de usuarios (soft delete)
- Asignar rol: `ADMIN` | `CONTABLE` | `JURIDICO`
- Ver carga de trabajo (tareas activas por usuario)
- Correos corporativos bajo el dominio del estudio

---

### 3.12 Módulo Jurídico *(Fase 2)*

**Expedientes:**
```typescript
{
  titulo: string
  clienteId: string
  tipo: 'DEMANDA' | 'CONTESTACION' | 'APELACION' | 'AUDIENCIA' | 'OTRO'
  estado: 'NUEVO' | 'EN_PROCESO' | 'EN_REVISION' | 'COMPLETADO' | 'ARCHIVADO'
  responsableId: userId
  fechaInicio: Date
  fechaLimite?: Date
  documentos: Archivo[]
  notas: Nota[]
  historial: HistorialItem[]
}
```

Los plazos procesales se integran al calendario de vencimientos.

---

### 3.13 Panel Super Administrador *(oculto al cliente)*

Acceso exclusivo del desarrollador — URL separada, credenciales propias.

- Ver estado de licencia: `ACTIVA` | `SUSPENDIDA` | `POR_VENCER`
- Registrar pagos manualmente
- Suspender / reactivar con 1 clic
- Mensaje personalizado en pantalla de suspensión
- Alerta automática al proveedor 5 días antes del vencimiento de pago
- Historial de pagos y suspensiones

---

## 4. Base de Datos (esquema simplificado)

```prisma
model User {
  id        String   @id @default(cuid())
  nombre    String
  email     String   @unique
  password  String
  rol       Rol      // ADMIN | CONTABLE | JURIDICO | SUPERADMIN
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model Cliente {
  id           String       @id @default(cuid())
  nombre       String
  ruc          String       @unique
  cedula       String?
  telefono     String?
  email        String?
  direccion    String?
  tipo         TipoCliente  // CONTABLE | JURIDICO | AMBOS
  estado       EstadoCliente
  estadoFiscal EstadoFiscal
  responsableId String
  obligaciones Json         // array de obligaciones activas
  accesos      Json?        // encriptado — solo ADMIN
  createdAt    DateTime     @default(now())
}

model EstadoMensual {
  id             String   @id @default(cuid())
  clienteId      String
  mes            String   // "2026-06"
  obligacion     String   // "IVA"
  estado         EstadoObligacion
  fechaPresentacion DateTime?
  responsableId  String?
  createdAt      DateTime @default(now())
}

model Declaracion {
  id          String   @id @default(cuid())
  clienteId   String
  tipo        String
  periodo     String
  fechaPresentacion DateTime
  archivoUrl  String
  archivado   Boolean  @default(false)
  cargadoPor  String
  createdAt   DateTime @default(now())
}

model Vencimiento {
  id           String   @id @default(cuid())
  clienteId    String
  tipo         String
  fechaVencimiento DateTime
  estado       EstadoVencimiento // PENDIENTE | GESTIONADO | VENCIDO
  responsableId String?
  createdAt    DateTime @default(now())
}

model Tarea {
  id           String   @id @default(cuid())
  titulo       String
  descripcion  String?
  clienteId    String?
  responsableId String
  prioridad    Prioridad
  fechaLimite  DateTime?
  estado       EstadoTarea
  checklist    Json     @default("[]")
  createdAt    DateTime @default(now())
}

model Notificacion {
  id        String   @id @default(cuid())
  userId    String
  tipo      String
  mensaje   String
  leida     Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Licencia {
  id          String   @id @default(cuid())
  estado      EstadoLicencia // ACTIVA | SUSPENDIDA | POR_VENCER
  venceEl     DateTime
  mensajeSuspension String?
  createdAt   DateTime @default(now())
}
```

---

## 5. API Routes (Next.js App Router)

```
/api/auth/[...nextauth]     → autenticación
/api/clientes               → CRUD clientes
/api/clientes/[id]          → detalle, editar, desactivar
/api/clientes/[id]/declaraciones → declaraciones del cliente
/api/clientes/[id]/vencimientos  → vencimientos del cliente
/api/estado-mensual         → checklist mensual
/api/declaraciones          → subir / descargar / archivar
/api/vencimientos           → calendario, alertas
/api/asambleas              → calendario de prioridades
/api/tareas                 → CRUD tareas
/api/notificaciones         → listar, marcar leída
/api/usuarios               → gestión de equipo
/api/importar               → importación desde Excel
/api/admin/licencia         → superadmin — estado de licencia
/api/admin/licencia/suspender   → suspender acceso
/api/admin/licencia/activar     → reactivar acceso
```

---

## 6. Lógica de Alertas (cron jobs)

```typescript
// Ejecutar diariamente a las 8:00 AM (Paraguay UTC-4)

// 1. Vencimientos próximos
SELECT vencimientos WHERE fechaVencimiento BETWEEN hoy AND hoy+7dias AND estado='PENDIENTE'
→ crear notificación in-app
→ si ≤3 días: enviar email al responsable

// 2. Tareas vencidas
SELECT tareas WHERE fechaLimite < hoy AND estado != 'COMPLETADA'
→ crear notificación in-app

// 3. Licencia por vencer (superadmin)
SELECT licencia WHERE venceEl BETWEEN hoy AND hoy+5dias
→ enviar email al proveedor
```

---

## 7. Lógica de Suspensión

```
Licencia activa
  → acceso normal al sistema

Licencia suspendida
  → middleware intercepta TODAS las rutas excepto /login y /suspendido
  → redirige a /suspendido con mensaje personalizado
  → datos intactos en base de datos
  → al reactivar: acceso inmediato
```

---

## 8. Fases de Desarrollo

### Fase 1 — Prioridad (días 1–14)
- [ ] Setup: Next.js + Prisma + PostgreSQL + NextAuth + Tailwind
- [ ] Middleware de roles y suspensión de licencia
- [ ] Módulo Clientes (CRUD completo)
- [ ] Estado Mensual (checklist)
- [ ] Declaraciones Juradas (subir/descargar PDF)
- [ ] Calendario de Vencimientos (automático por RUC)
- [ ] Calendario de Asambleas
- [ ] Notificaciones in-app
- [ ] Dashboard con widgets

### Fase 1B — Completado (días 14–18)
- [ ] Importación desde Excel
- [ ] Tareas internas con checklist
- [ ] Notificaciones por email (Resend)
- [ ] Gestión de usuarios

### Lanzamiento (día 20)
- [ ] Carga de datos iniciales desde Excel del estudio
- [ ] Deploy en VPS + configuración de dominio

### Fase 2 — Jurídico (a definir)
- [ ] Módulo de expedientes judiciales
- [ ] Plazos procesales en calendario

---

## 9. Variables de entorno

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Email
RESEND_API_KEY=
EMAIL_FROM=no-reply@criterioasesores.com.py

# Storage (declaraciones PDF)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Superadmin
SUPERADMIN_EMAIL=
SUPERADMIN_PASSWORD=
```

---

## 10. Notas importantes

- **Marangatu y Judisoft** no tienen API pública. No hay integración automática. Carga manual o vía Excel.
- **Archivado de declaraciones:** a los 6 meses pasan a historial, nunca se eliminan.
- **Accesos de clientes** (Marangatu, IPS, etc.) se guardan encriptados y solo el rol `ADMIN` puede verlos.
- **Sin límite de usuarios** — el precio no escala por cantidad de usuarios.
- **Correos corporativos** bajo `@criterioasesores.com.py` para cada miembro del equipo.
