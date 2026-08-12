# GridGauge — Arquitectura

**Fecha:** 2026-08-12 · **Slug:** gridgauge · **Stack:** Angular 22 + NestJS 11 + TypeORM + better-sqlite3

## Visión general

GridGauge es un monitor de energía del hogar (electricidad, agua y gas) con cálculo de coste real por tarifa (tramos progresivos + discriminación horaria), presupuestos mensuales con proyección, detección de anomalías (picos estadísticos y ausencia de datos) y estimación de consumo por dispositivo. Single-user por diseño (scoping `WHERE user_id` en cada servicio).

## Estructura del monorepo

```
2026-08-12-gridgauge/
├── package.json              # workspace raíz (npm workspaces)
├── apps/
│   ├── api/                  # NestJS + TypeORM
│   │   ├── src/
│   │   │   ├── main.ts       # bootstrap, Swagger /api/docs, CORS, prefijo /api
│   │   │   ├── app.module.ts # ConfigModule + TypeOrmModule (better-sqlite3) + módulos
│   │   │   ├── common/types.ts       # UtilityType, AnomalyType, UTILITY_UNITS…
│   │   │   ├── entities/             # user, meter, reading, tariff, budget, anomaly, device
│   │   │   ├── dto/api.dto.ts        # DTOs con class-validator + ApiProperty
│   │   │   ├── auth/                 # JWT (passport-jwt) + bcryptjs
│   │   │   ├── meters/               # CRUD contadores + lecturas + series + stats + CSV import
│   │   │   ├── tariffs/              # CRUD tarifas + cálculo de coste (tramos/punta-valle)
│   │   │   ├── budgets/              # Presupuestos + estado (on_track/at_risk/exceeded)
│   │   │   ├── anomalies/            # Detector (spike/no_data) + feed + resolución
│   │   │   ├── devices/              # Electrodomésticos + reparto estimado
│   │   │   ├── dashboard/            # Resumen agregado del panel
│   │   │   ├── reports/              # Informe mensual + export CSV (BOM)
│   │   │   ├── settings/             # Factores CO₂ + umbrales (JSONB)
│   │   │   └── seed/                 # Seed demo idempotente (OnModuleInit + SEED_DB=true)
│   │   └── data/             # SQLite (gridgauge.db, gitignored)
│   └── web/                  # Angular 22 standalone, zoneless
│       └── src/
│           ├── styles.source.css     # Design system "Volt & Ash" (Tailwind v4 @theme)
│           ├── scripts/build-css.cjs # Pre-compila Tailwind v4 → styles.css
│           └── app/
│               ├── layouts/          # app-shell (sidebar 240px) + auth-layout
│               ├── pages/            # 11 páginas lazy-loaded
│               ├── services/         # 9 servicios HTTP + auth + theme + toast
│               ├── shared/           # KPI, line-chart, bar-chart, badge, modal, skeleton…
│               ├── guards/           # authGuard / guestGuard
│               └── interceptors/     # Bearer token
```

## Decisiones clave

| Decisión | Por qué |
|----------|---------|
| better-sqlite3 (local) / Neon (prod) | Mismo código TypeORM; `DATABASE_TYPE` por env |
| Seed en `OnModuleInit` + `SEED_DB=true` | Idempotente: no pisa datos existentes |
| Cálculo de coste en backend (TariffService) | Única fuente de verdad; presupuestos e informes lo reutilizan |
| Series con CTE recursivo | SQLite no tiene `generate_series`; huecos → 0 |
| Detección de anomalías idempotente | Índice parcial + `findOne` antes de crear; auto-resolución de `no_data` al recibir lectura |
| Dark-first con toggle `.light` | Design system "Volt & Ash": elevación por luminancia |
| JWT en localStorage + interceptor | Patrón probado en scanforge (sesión sobrevive reload) |

## Flujo de datos

1. **Lectura** → `POST /api/meters/:id/readings` → guarda + dispara `AnomalyDetectorService.onReadingCreated` (auto-resuelve `no_data`, evalúa spike por z-score).
2. **Coste** → `TariffService.calculateCost(tariff, value, start, end)`: aplica tramos (`tiers`) si existen, luego prorratea punta/valle por horas reales del periodo, y devuelve `{variable, fixedFee, total, peakOffPeakApplied}`.
3. **Presupuesto** → `BudgetService.withStatus`: suma lecturas del mes × coste de la tarifa del contador + cuota fija → `spent`, `usedPct`, `projection` (extrapolación día), `status`.
4. **Dashboard** → `DashboardService.summary`: KPIs por utility (mes + delta), presupuesto global, anomalías abiertas, últimas lecturas.
5. **Informe** → `ReportsService`: agrega por utility y calcula CO₂ con factores del usuario.

## Seguridad

- JWT (passport-jwt) con secret por env; bcryptjs para hashing.
- Scoping estricto por `userId` en todos los repos (patrón single-user).
- Errores de negocio con códigos: `EMAIL_IN_USE`, `INVALID_CREDENTIALS`, `PERIOD_DUPLICATE`, `BUDGET_PERIOD_DUPLICATE`, `TARIFF_IN_USE`, `ALREADY_RESOLVED`.

## Puertos y despliegue

- API: **3046** (dev), Swagger en `/api/docs`.
- Frontend: servido estático; `/api/*` proxied por Caddy en prod (mismo patrón que scanforge).
