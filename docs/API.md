# GridGauge — API

Base: `/api` · Auth: `Authorization: Bearer <jwt>` (excepto register/login) · Errores: `{statusCode, message, error?}`

## Auth

| Método | Path | Body | Respuesta |
|--------|------|------|-----------|
| POST | `/auth/register` | `{email, password, displayName?}` | `201 {token, user}` |
| POST | `/auth/login` | `{email, password}` | `200 {token, user}` |
| GET | `/auth/profile` | — | `200 User` |
| PATCH | `/auth/profile` | `{displayName?, currency?}` | `200 User` |

## Meters & Readings

| Método | Path | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/meters` | — | `Meter[]` (+tariff, lastReading, monthConsumption, monthCost, openAnomalies) |
| POST | `/meters` | `{name, utilityType, location?, serialNumber?, tariffId?, active?}` | `201 Meter` |
| GET | `/meters/:id` | — | `Meter` + stats |
| PATCH | `/meters/:id` | `{name?, location?, tariffId?, active?}` | `200 Meter` |
| DELETE | `/meters/:id` | — | `204` |
| GET | `/meters/:id/readings` | `page, limit, from?, to?` | `{items, total}` |
| POST | `/meters/:id/readings` | `{periodStart, periodEnd, value, notes?}` | `201 Reading` (409 PERIOD_DUPLICATE) |
| POST | `/meters/:id/readings/bulk` | multipart `file` (CSV) | `{imported, skipped, errors[]}` |
| DELETE | `/readings/:id` | — | `204` |
| GET | `/meters/:id/series` | `bucket=day\|week\|month\|year, from, to` | `{points: [{date, value}], unit}` — huecos a 0 |
| GET | `/meters/:id/stats` | `period=YYYY-MM` | `{consumption, cost, prevPeriod, prevCost, deltaPct, unit}` |

## Tariffs

| Método | Path | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/tariffs` | — | `Tariff[]` (+inUse, meterCount) |
| POST | `/tariffs` | `{name, utilityType, unitPrice, fixedFee, tiers?, peakOffPeak?}` | `201 Tariff` |
| GET | `/tariffs/:id` | — | `Tariff` |
| PATCH | `/tariffs/:id` | `{name?, unitPrice?, fixedFee?, tiers?, peakOffPeak?, active?}` | `200 Tariff` |
| DELETE | `/tariffs/:id` | — | `204` / `409 TARIFF_IN_USE` |
| POST | `/tariffs/:id/duplicate` | — | `201 Tariff` |

**Estructura de precios** (`tiers` y `peakOffPeak` son JSON):

```json
{ "tiers": [{ "upTo": 100, "price": 0.15 }, { "upTo": 250, "price": 0.17 }, { "price": 0.2 }] }
{ "peakOffPeak": { "enabled": true, "peakHours": [[23, 7]], "peakPrice": 0.84, "offPeakPrice": 0.61 } }
```

El cálculo prorratea punta/valle por horas reales del periodo (ventanas que cruzan medianoche soportadas).

## Budgets

| Método | Path | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/budgets` | `period=YYYY-MM` | `Budget[]` (+meterName, spent, usedPct, projection, status) |
| POST | `/budgets` | `{meterId, period, amount}` | `201 Budget` (409 duplicado) |
| PATCH | `/budgets/:id` | `{amount?}` | `200 Budget` |
| DELETE | `/budgets/:id` | — | `204` |

`status`: `on_track` (proyección ≤ presupuesto) · `at_risk` (proyección > presupuesto) · `exceeded` (gastado > presupuesto).

## Anomalies

| Método | Path | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/anomalies` | `type?, severity?, status=open\|resolved, page` | `{items, total}` |
| PATCH | `/anomalies/:id/resolve` | `{note?}` | `200 Anomaly` |
| PATCH | `/anomalies/:id/dismiss` | — | `200 Anomaly` |
| POST | `/anomalies/detect` | — | `{created, escalated, autoResolved}` |

Tipos: `spike` (z > 2.5σ, warning; z > 4σ, critical) · `no_data` (48h warning / 72h critical) · `surge` · `device_usage` · `inactive`.

## Devices

| Método | Path | Body | Respuesta |
|--------|------|------|-----------|
| GET | `/devices` | — | `Device[]` (+kwhPerDay, sharePct) |
| POST | `/devices` | `{meterId, name, wattage, hoursPerDay}` | `201 Device` |
| PATCH | `/devices/:id` | `{name?, wattage?, hoursPerDay?, active?}` | `200 Device` |
| DELETE | `/devices/:id` | — | `204` |

## Dashboard / Reports / Settings

| Método | Path | Respuesta |
|--------|------|-----------|
| GET | `/dashboard/summary` | `{kpis[], budgetGlobal, anomaliesOpen[], recentReadings[], currency}` |
| GET | `/reports/:year/:month` | `{totalConsumption, totalCost, co2, byUtility[], yoy[], currency}` |
| GET | `/reports/:year/:month/export` | CSV con BOM (attachment) |
| PATCH | `/settings/co2` | `{electricity, water, gas}` → `User` |
| PATCH | `/settings/prefs` | `{spikeThresholdSigma?, quietWindow?}` → `User` |

## Notas

- Fechas ISO-8601 UTC; periodos en zona del usuario (default `Europe/Madrid`).
- CSV import: filas inválidas se omiten y se reportan (nunca falla el lote). Máx 500 filas.
- Detección idempotente: índice único parcial por (tipo, lectura) — re-ejecutar no duplica.
