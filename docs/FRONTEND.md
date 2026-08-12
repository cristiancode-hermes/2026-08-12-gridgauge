# GridGauge — Frontend

**Angular 22 standalone + zoneless** · Tailwind v4 pre-compilado · Design system **"Volt & Ash"**

## Arranque y build

```bash
cd apps/web
node scripts/build-css.cjs   # Tailwind v4 @theme → styles.css (Angular 22 no procesa @import "tailwindcss")
node ../../node_modules/.bin/ng build
# Salida: dist/web/browser/  (¡no dist/web! — pitfall Angular 22)
```

Dev: `ng serve` con proxy `/api` → `localhost:3046`. Prod: estático + Caddy proxya `/api`.

## Design system — Volt & Ash

Dark-first (substation black `#0A0E14`), un acento ámbar (`#FFB224`) + cian agua + terracota gas.

| Token | Dark | Light |
|-------|------|-------|
| `--gg-bg` | `#0A0E14` | `#F4F6F9` |
| `--gg-surface` | `#11161F` | `#FFFFFF` |
| `--gg-surface-2` | `#1A2130` | `#EAEEF4` |
| `--gg-ink` | `#E9EEF5` | `#161C26` |
| `--gg-muted` | `#9AA7B8` | `#4E5A6B` |
| `--gg-faint` | `#5F6B7C` | `#7A8699` |
| `--gg-border` | `#232C3B` | `#DCE2EA` |
| `--gg-accent` (texto) | `#FFB224` | `#8A5A00` |
| `--gg-accent-bg` (botón) | `#FFB224` | `#F5A623` |
| `--gg-water` | `#3BC9E8` | `#0E7C9B` |
| `--gg-gas` | `#E8785C` | `#B3471F` |

- **Regla de contraste (light):** los acentos de utility se usan en versión oscura (texto-safe). El botón primario usa `--gg-accent-bg` con texto `--gg-accent-ink` (8.4:1).
- **Números SIEMPRE en JetBrains Mono + tabular-nums** (KPIs, tablas, deltas).
- Elevación por luminancia (modelo Linear), sin sombras en dark; `prefers-reduced-motion` respetado.
- Bans: gradientes de texto, glassmorphism, emojis decorativos, eyebrows uppercase por sección.

## Rutas

| Ruta | Página | Notas |
|------|--------|-------|
| `/login`, `/register` | Auth | guestGuard, formulario pre-relleno demo |
| `/dashboard` | Panel | KPIs por utility, chart 30d, presupuesto global, anomalías, últimas lecturas |
| `/meters` | Contadores | Tabla + modal crear/editar |
| `/meters/:id` | Detalle | KPIs del mes, serie, lecturas (paginadas 50), alta manual, import CSV |
| `/tariffs` | Tarifas | CRUD + duplicar; estructura (tramos/punta-valle) mostrada |
| `/budgets` | Presupuestos | Selector de mes, barras de progreso, estados |
| `/anomalies` | Anomalías | Filtros (estado/severidad/tipo), resolver/descartar, ejecutar detectores |
| `/devices` | Dispositivos | kWh/día estimado + % reparto |
| `/reports` | Informes | KPI totales, bar-chart por utility, tabla CO₂, export CSV |
| `/settings` | Ajustes | Perfil, moneda, tema, factores CO₂, umbral σ |

## Componentes compartidos (`shared/`)

- `kpi-card` — label + valor Stat 28px mono + delta ▲/▼ colorizado
- `line-chart` / `bar-chart` — SVG propio, grid dashed, reveal con stroke-dashoffset, `viewBox` responsive
- `badge` — utility (color de suministro), severidad, estado
- `modal` — overlay + panel `surface-2`, animación rise
- `skeleton`, `empty-state`, `toast-container`

## Servicios

| Servicio | Endpoints usados |
|----------|------------------|
| `AuthService` | login/register/profile, token en `localStorage.gg_token`, logout |
| `MetersService` | CRUD meters + readings + bulk + series + stats |
| `TariffsService` | CRUD + duplicate |
| `BudgetsService` | list(period)/create/update/remove |
| `AnomaliesService` | list filtros + resolve/dismiss + detect |
| `DevicesService` | CRUD |
| `DashboardService` | summary |
| `ReportsService` | get + export CSV (blob → download) |
| `SettingsService` | co2 + prefs |
| `ThemeService` | toggle `.light` en `<html>` persistido en localStorage |

## Pitfalls resueltos

1. **Series API devuelve `{date, value}`** (no `periodStart`) — el chart usa `date + 'T00:00:00Z'` para etiquetas correctas (evita NaN/NaN).
2. **Dashboard KPI crudo** usa `month`/`today`/`monthCost` — se mapea a `Kpi {value}` en el componente.
3. **`anomaliesOpen` es array** en la API (no número) — se usa `.length`.
4. **`byUtility` usa `utility` + `label`** en reports (no `utilityType`).
5. **Dist en `dist/web/browser/`** — el proxy de verificación debe apuntar ahí.
6. **`[disabled]="editing()"`** con signal nullable → usar `!!editing()` (TS estricto).
7. **Botón primario light** necesita `--gg-accent-bg` separado del acento texto (`#F5A623` vs `#8A5A00`).
