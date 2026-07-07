# DESIGN.md — Sistema de Gestión Interna
## Criterio Asesores S.R.L

---

## 1. Identidad Visual

Basado en el sitio oficial criterioasesores.com.py.

```
Primario:    #1A2C4E   (azul marino oscuro)
Secundario:  #C9A84C   (dorado / ocre)
Fondo:       #F8F9FA   (gris muy claro)
Superficie:  #FFFFFF   (blanco — cards, paneles)
Borde:       #E2E8F0   (gris claro)
Texto base:  #1E293B   (casi negro)
Texto suave: #64748B   (gris medio)
Éxito:       #16A34A
Advertencia: #D97706
Peligro:     #DC2626
Info:        #2563EB
```

**Tipografía:**
```
Display / Títulos: Inter — Bold 700
Cuerpo:            Inter — Regular 400 / Medium 500
Tablas / Data:     Inter — Regular 400, tamaño reducido
Monospace (RUC):   JetBrains Mono — para RUC, fechas, códigos
```

**Border radius:**
```
Cards:    rounded-xl   (12px)
Botones:  rounded-lg   (8px)
Badges:   rounded-full
Inputs:   rounded-lg   (8px)
```

---

## 2. Layout General

```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (240px fijo)  │  MAIN CONTENT              │
│                        │                            │
│  [Logo Criterio]       │  [Topbar]                  │
│                        │  ─────────────────────     │
│  Navegación por módulo │  [Contenido de la página]  │
│                        │                            │
│  ─────────────────     │                            │
│  [Avatar + nombre]     │                            │
│  [Cerrar sesión]       │                            │
└─────────────────────────────────────────────────────┘
```

**Sidebar:**
- Fondo: `#1A2C4E` (azul marino)
- Texto nav: blanco con opacidad 70% en reposo, 100% activo
- Item activo: fondo `#C9A84C` (dorado) con texto blanco
- Hover: fondo blanco con opacidad 10%
- Ancho: 240px en desktop, colapsable en mobile

**Topbar:**
- Fondo: blanco, borde inferior `#E2E8F0`
- Breadcrumb a la izquierda
- Campana de notificaciones + avatar a la derecha

---

## 3. Componentes UI

### Botones
```
Primary:    bg-[#1A2C4E] text-white hover:bg-[#243d6b]
Secondary:  bg-[#C9A84C] text-white hover:bg-[#b8963d]
Outline:    border border-[#1A2C4E] text-[#1A2C4E] hover:bg-slate-50
Danger:     bg-red-600 text-white hover:bg-red-700
Ghost:      text-slate-600 hover:bg-slate-100
```

Tamaños: `sm` (h-8 px-3 text-sm) · `md` (h-10 px-4) · `lg` (h-11 px-6)

---

### Cards
```jsx
<div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
  {/* contenido */}
</div>
```

Cards de dashboard con número grande arriba y label abajo:
```jsx
<div className="bg-white rounded-xl border border-slate-200 p-5">
  <p className="text-sm text-slate-500">Vencimientos próximos</p>
  <p className="text-3xl font-bold text-[#1A2C4E] mt-1">7</p>
  <p className="text-xs text-red-500 mt-1">3 críticos esta semana</p>
</div>
```

---

### Badges de estado
```jsx
// Estados del cliente
ACTIVO:        bg-green-100  text-green-800
INACTIVO:      bg-slate-100  text-slate-600
PROSPECTO:     bg-blue-100   text-blue-800

// Estado fiscal
AL_DIA:        bg-green-100  text-green-800
ATRASADO:      bg-red-100    text-red-800
CCT:           bg-yellow-100 text-yellow-800
VECTOR_FISCAL: bg-orange-100 text-orange-800

// Obligaciones
PRESENTADO:    bg-green-100  text-green-800  + ✅
PENDIENTE:     bg-yellow-100 text-yellow-800 + ⏳
VENCIDO:       bg-red-100    text-red-800    + ❌
NO_APLICA:     bg-slate-100  text-slate-500  + —

// Tareas
PENDIENTE:     bg-slate-100  text-slate-600
EN_PROGRESO:   bg-blue-100   text-blue-800
COMPLETADA:    bg-green-100  text-green-800

// Prioridad
ALTA:          bg-red-100    text-red-700   + punto rojo
MEDIA:         bg-yellow-100 text-yellow-700
BAJA:          bg-slate-100  text-slate-600
```

---

### Tabla de datos
```jsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-slate-200 bg-slate-50">
      <th className="text-left py-3 px-4 font-medium text-slate-600 text-xs uppercase tracking-wide">
        Cliente
      </th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="py-3 px-4">...</td>
    </tr>
  </tbody>
</table>
```

---

### Inputs
```jsx
<input
  className="w-full h-10 px-3 rounded-lg border border-slate-300
             text-sm text-slate-900 placeholder:text-slate-400
             focus:outline-none focus:ring-2 focus:ring-[#1A2C4E]/20
             focus:border-[#1A2C4E] transition-colors"
/>
```

Labels: `text-sm font-medium text-slate-700 mb-1.5`  
Error: `text-xs text-red-500 mt-1`

---

### Notificaciones / Toasts
```
Éxito:      bg-green-50  border-l-4 border-green-500
Error:      bg-red-50    border-l-4 border-red-500
Advertencia:bg-yellow-50 border-l-4 border-yellow-500
Info:       bg-blue-50   border-l-4 border-blue-500
```

Posición: esquina inferior derecha, auto-dismiss 4 segundos.

---

## 4. Páginas por módulo

### /dashboard
```
┌──────────────────────────────────────────────────┐
│  Buenos días, Karina                             │
│  Miércoles 2 de julio de 2026                    │
├──────────┬──────────┬──────────┬─────────────────┤
│ Tareas   │Expedient.│Vencim.   │ Clientes        │
│   12     │    8     │   5      │    47           │
│ pendient.│ activos  │ próximos │ activos         │
├──────────┴──────────┴──────────┴─────────────────┤
│  VENCIMIENTOS ESTA SEMANA        ACTIVIDAD        │
│  🔴 IVA Plastisur — hoy          Karina actualizó│
│  🟡 IRE El Toro — en 2 días      IVA de Toreto   │
│  🟡 IPS Mirta Cáceres — en 3d    hace 5 min      │
└──────────────────────────────────────────────────┘
```

---

### /clientes
```
┌─────────────────────────────────────────────────┐
│  Clientes              [+ Nuevo cliente] [Importar]│
│  Buscar... [Filtro: Todos ▼] [Estado: Todos ▼]  │
├─────────────────────────────────────────────────┤
│  Nombre         RUC        Estado  Responsable   │
│  Plastisur EAS  80150600   ●AL DÍA  Karina       │
│  El Toro SRL    80119934   ●CCT     Karina       │
│  Mirta Cáceres  4689200    ●VECTOR  Noelia       │
└─────────────────────────────────────────────────┘
```

**Página de detalle del cliente:**
```
Tabs: [Resumen] [Estado Mensual] [Declaraciones] [Vencimientos] [Tareas]
```

---

### /estado-mensual
```
  Mes: [Junio 2026 ▼]

  Cliente          IVA     IRE    IPS    MITES   EEFF
  Plastisur EAS    ✅      ✅     ⏳     ❌      —
  El Toro SRL      ✅      ⏳     ✅     ⏳      ⏳
  Mirta Cáceres    ❌      —      ✅     —       —
```

Click en celda → modal con detalles + opción de tildar + adjuntar PDF.

---

### /declaraciones (dentro del perfil del cliente)
```
  [+ Subir declaración]

  Tipo    Período      Fecha         Cargado por  
  IVA     jun-2026     13/06/2026    Karina       [⬇ Descargar]
  IVA     may-2026     12/05/2026    Karina       [⬇ Descargar]
  IRE     2025         10/03/2026    Noelia       [⬇ Descargar]
  
  ── Historial (> 6 meses) ──────────────────────────────────
  IVA     dic-2025     13/01/2026    Karina       [⬇ Descargar]
```

---

### /calendario
```
  [Vista: Mes ▼]  [Julio 2026]  [< >]
  [Filtro cliente] [Filtro tipo]

  Lun  Mar  Mié  Jue  Vie  Sáb  Dom
   —    —    —    —   4🔴  —    —
   7🔴  8    9🟡  10   11🟡 12   13
  ...
  
  🔴 Urgente (hoy / vencido)
  🟡 Próximo (≤3 días)
  🔵 Normal
```

---

### /tareas
Vista Kanban:
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  PENDIENTE  │  │ EN PROGRESO │  │  COMPLETADA │
│─────────────│  │─────────────│  │─────────────│
│ [Card]      │  │ [Card]      │  │ [Card]      │
│ Liquidar IVA│  │ EEFF Toreto │  │ IPS Mirta   │
│ Karina · Alta│  │ Noelia · Med│  │ Karina      │
│ Vence: 7/7 │  │ Vence: 10/7 │  │ 30/6/2026   │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

### /asambleas
```
  [+ Nueva asamblea]  [Mes: Junio 2026 ▼]

  Cliente         Fecha EEFF   Asamblea    Confirmada  IDU  MTTES  IPS
  Mirta Cáceres   24/6/2026    ✅           ✅          ☐    ☐      ✅
  Plastisur EAS   24/6/2026    ✅           ✅          ☐    ☐      ☐
  El Toro SRL     16/6/2026    ✅           ✅          ☐    ☐      ☐
```

---

## 5. Pantalla de Suspensión

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         [Logo Criterio Asesores]                │
│                                                 │
│    ⚠️  Acceso temporalmente suspendido           │
│                                                 │
│    El acceso al sistema está suspendido.        │
│    Por favor contacte a su proveedor para       │
│    regularizar su suscripción.                  │
│                                                 │
│    [mensaje personalizado del proveedor]        │
│                                                 │
│    Contacto: [email/teléfono del desarrollador] │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 6. Responsive

| Breakpoint | Comportamiento |
|---|---|
| `< 768px` | Sidebar colapsado (hamburger), tablas con scroll horizontal |
| `768px–1024px` | Sidebar colapsado por defecto, expandible |
| `> 1024px` | Sidebar fijo visible |

Las tablas en mobile muestran solo columnas esenciales + botón "Ver más".  
El dashboard en mobile apila los widgets verticalmente.

---

## 7. Estructura de carpetas (Next.js App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── layout.tsx          ← sidebar + topbar
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   │   ├── page.tsx        ← lista
│   │   │   └── [id]/
│   │   │       ├── page.tsx    ← detalle con tabs
│   │   │       ├── estado-mensual/
│   │   │       ├── declaraciones/
│   │   │       ├── vencimientos/
│   │   │       └── tareas/
│   │   ├── estado-mensual/
│   │   ├── calendario/
│   │   ├── asambleas/
│   │   ├── tareas/
│   │   ├── notificaciones/
│   │   └── usuarios/
│   ├── (superadmin)/
│   │   └── admin/
│   │       └── licencia/
│   ├── suspendido/
│   └── api/
│       ├── auth/
│       ├── clientes/
│       ├── declaraciones/
│       ├── vencimientos/
│       ├── tareas/
│       ├── notificaciones/
│       └── admin/
├── components/
│   ├── ui/                     ← botones, inputs, badges, modals
│   ├── layout/                 ← sidebar, topbar, breadcrumb
│   ├── clientes/               ← ClienteCard, ClienteForm, etc.
│   ├── declaraciones/
│   ├── calendario/
│   ├── tareas/
│   └── notificaciones/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── email.ts               ← Resend
│   ├── storage.ts             ← Cloudinary
│   ├── vencimientos.ts        ← lógica calendario DNIT
│   └── importar.ts            ← lógica Excel
├── hooks/
│   ├── useNotificaciones.ts
│   └── useVencimientos.ts
└── middleware.ts               ← control de roles + suspensión
```

---

## 8. Middleware (control de acceso)

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Verificar licencia activa
  const licenciaActiva = checkLicencia()
  if (!licenciaActiva && !pathname.startsWith('/suspendido') && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/suspendido', request.url))
  }

  // 2. Control de roles
  const session = getSession()
  const rolRoutes = {
    '/clientes': ['ADMIN', 'CONTABLE', 'JURIDICO'],
    '/admin':    ['SUPERADMIN'],
  }
  // redirigir si el rol no tiene acceso a la ruta
}
```

---

## 9. Convenciones de código

- **Componentes:** PascalCase — `ClienteCard.tsx`
- **Hooks:** camelCase con `use` — `useVencimientos.ts`
- **API routes:** kebab-case — `/api/estado-mensual`
- **Prisma models:** PascalCase singular — `Cliente`, `Declaracion`
- **Variables env:** SCREAMING_SNAKE_CASE
- **Fechas:** siempre en UTC en DB, mostrar en hora Paraguay (UTC-4)
- **Moneda:** Gs. se muestra formateada: `Gs. 9.150.000` (puntos como separador de miles)
- **Errores API:** `{ error: string, code?: string }` con HTTP status apropiado
- **Éxito API:** `{ data: T, message?: string }`

