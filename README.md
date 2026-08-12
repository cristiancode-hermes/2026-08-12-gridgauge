# GridGauge — Monitorización de Consumo Energético ⚡💧🔥

Dashboard personal de consumo energético (electricidad, agua, gas) que convierte lecturas de contadores en **coste real, proyecciones de factura, alertas de anomalías y presupuestos mensuales**.

## ✨ Funcionalidades

- **Contadores (Meters)** — CRUD por utility (electricidad kWh / agua m³ / gas m³), activo/inactivo, tarifa asignada, detalle con KPIs del mes.
- **Lecturas (Readings)** — Alta manual por periodo, importación CSV en lote (máx 500 filas), listado paginado, rechazo de duplicados por periodo.
- **Tarifas (Tariffs)** — Precio unitario, cuota fija, **tramos progresivos** (JSONB) y **discriminación horaria** con ventanas que cruzan medianoche.
- **Dashboard KPI** — Consumo hoy/este mes por utility, coste, progreso de presupuesto, anomalías abiertas, mini-charts SVG.
- **Series temporales** — Buckets día/semana/mes/año con `generate_series` + COALESCE, comparativa vs periodo anterior.
- **Anomalías** — Detección automática: pico (>2.5σ), sostenido alto (3 días ≥2σ), sin datos (≥48h), fuga (consumo nocturno 02:00–05:00). Severidad info/warning/critical, resolver/descartar.
- **Presupuestos** — Objetivo mensual por contador, % usado, proyección de desviación, estado `on_track` / `at_risk` / `exceeded`.
- **Dispositivos** — Electrodomésticos (vatios × horas/día) → estimación de reparto por contador.
- **Informes** — Mensual con comparativa YoY, CO₂ estimado (factores configurables) y export CSV con BOM.
- **Dark UI responsive** — Paleta "Volt & Ash" (dark-native, acento ámbar eléctrico + cian agua + terracota gas), modo claro, charts SVG propios.

## 🛠️ Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 22 (signals, zoneless) + Tailwind CSS v4 |
| Backend | NestJS 11 + TypeORM 1.0 |
| Base de datos | better-sqlite3 (dev) / Neon PostgreSQL (prod, SQL compatible) |
| Auth | JWT + bcryptjs + Passport (guard global, `@CurrentUser()`) |
| Charts | SVG propio + computed signals (sin librería externa) |

## 🚀 Ejecución

```bash
# API (dev)
cd apps/api
npm install
SEED_DB=true PORT=3057 npm run start:dev

# Web (dev)
cd apps/web
npm install
npm start
```

Demo: `casa@gridgauge.dev` / `demo1234` (con `SEED_DB=true` se genera 1 usuario, 3 contadores, 3 tarifas, ~270 lecturas, 2 anomalías, 1 presupuesto y 4 dispositivos).

## 🧪 Tests

```bash
cd apps/api && npm test
# 28 tests — tarifas (tramos, ventanas que cruzan medianoche), anomalías (2.5σ), presupuestos, auth
```

## 🔌 API (resumen)

Base: `/api` — todas las rutas salvo `auth/register` y `auth/login` requieren `Authorization: Bearer <token>`.

| Módulo | Endpoints |
|--------|-----------|
| Auth | `POST /auth/register` · `POST /auth/login` · `GET/PATCH /auth/profile` |
| Meters | `GET/POST /meters` · `GET/PATCH/DELETE /meters/:id` |
| Readings | `GET/POST /meters/:id/readings` · `POST /meters/:id/readings/bulk` · `DELETE /readings/:id` |
| Series | `GET /meters/:id/series` · `GET /meters/:id/stats` |
| Tariffs | `GET/POST /tariffs` · `GET/PATCH/DELETE /tariffs/:id` · `POST /tariffs/:id/duplicate` |
| Budgets | `GET/POST /budgets` · `PATCH/DELETE /budgets/:id` |
| Anomalies | `GET /anomalies` · `PATCH /anomalies/:id/resolve` · `PATCH /anomalies/:id/dismiss` · `POST /anomalies/detect` |
| Devices | `GET/POST /devices` · `PATCH/DELETE /devices/:id` |
| Dashboard | `GET /dashboard/summary` |
| Reports | `GET /reports/:year/:month` · `GET /reports/:year/:month/export` |

Swagger: `/api/docs`
