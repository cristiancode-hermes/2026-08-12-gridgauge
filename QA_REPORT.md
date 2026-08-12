# QA Report — 2026-08-12 GridGauge

**Project:** Monitorización de consumo energético (electricidad, agua, gas) — lecturas, tarifas con tramos/discriminación horaria, detección de anomalías, presupuestos, informes.
**Stack:** Angular 22 (signals, zoneless) + Tailwind v4 · NestJS 11 + TypeORM 1.1 · better-sqlite3 · JWT/bcryptjs
**Author:** Hermes Daily Builder
**Demo:** `casa@gridgauge.dev` / `demo1234` (seed: 3 contadores, 3 tarifas, 270 lecturas, 2 anomalías, 1 presupuesto, 4 dispositivos)

## ✅ 1. Build Verification

| Target | Status | Details |
|--------|--------|---------|
| API (`tsc -p tsconfig.json`) | ✅ | Exit 0, `dist/main.js` generado, sin errores |
| Web (`build-css.cjs && ng build`) | ✅ | Bundle 146 kB (39 kB gzip), 15 lazy chunks, output `dist/web/browser/` |
| TS version | ✅ | 6.0.3 (workspace root, compatible Angular 22) |

## ✅ 2. Test Results

28 test cases · 4 suites — ALL PASSED (jest, 3.0s)

| Test Suite | Test Case | Assertions |
|------------|-----------|------------|
| auth.service.spec | registro, login, hash bcrypt, JWT | ✅ |
| tariff.service.spec | límites de tramos, ventana punta/valle que cruza medianoche | ✅ |
| budget.service.spec | presupuesto en límite exacto, proyección de desviación, duplicados | ✅ |
| anomaly-detector.service.spec | umbral 2.5σ, sostenido alto, no_data 48h, falsos positivos | ✅ |

## ✅ 3. Runtime / Endpoint Verification

28/28 checks funcionales via script (login, register 201, duplicate 409, perfil 200/401, meters, readings paginadas, series, stats, tariffs + duplicate/delete, budgets, anomalies, detect, devices, dashboard/summary, reports + CSV con BOM, CRUD meter→reading→409 duplicado→delete cascada) + 3 checks de ciclo de anomalía (resolve 200, re-resolve 409 ALREADY_RESOLVED, dismiss 200).

| Check | Result |
|-------|--------|
| Login demo (API + vía proxy Caddy) | ✅ 200 + token |
| Login password erróneo | ✅ 401 |
| Register → 201, duplicado → 409 EMAIL_IN_USE | ✅ |
| `/api/dashboard/summary` | ✅ 3 KPIs, budget 105% (exceeded), 1 anomalía abierta, 8 lecturas recientes |
| `/api/reports/2026/8/export` | ✅ CSV con BOM (`utility,meter,period_start,...`) |
| Swagger `/api/docs` | ✅ 200 |

## ✅ 4. Quality Audit

| Criterion | Verdict | Notes |
|-----------|---------|-------|
| Auth completo browser | ✅ | login → dashboard con datos → logout (token null) → guard redirige /meters→/login |
| Register browser | ✅ | usuario nuevo → dashboard con empty states correctos (sin presupuesto, sin anomalías, "datos insuficientes") |
| Páginas renderizadas | ✅ | Panel, Contadores, Tarifas, Anomalías (filtros + resolver/descartar), Informes (mes + export + CO₂) |
| Errores de consola | ✅ | 0 console errors / 0 JS errors |
| DB demo intacta | ✅ | anomalía restaurada tras test, usuarios QA purgados |

### Fixes aplicados durante QA
| Issue | Severity | Fix |
|-------|----------|-----|
| `where: { resolvedAt: (null as any) }` (2 sitios, anomaly-detector) — TypeORM 1.x rechaza `null as any` en criterios | Media (crash runtime en detección) | `IsNull()` (ya importado) — build + 28 tests verdes tras el fix |

### Minor Issues
| Issue | Severity | Suggestion |
|-------|----------|------------|
| Informes: tarjetas muestran `62.77EUR` / `190.6unid.` sin espacio entre número y unidad | Cosmética | Añadir espacio en el formateo de las tarjetas resumen |
| Chart dashboard muestra ~25 días etiquetados "últimos 30 días" | Cosmética | Ajustar rango `from` a 30 días exactos |

## ✅ 5. Security Scan

| Check | Result |
|-------|--------|
| `***` malformed template literals (interceptor, scripts) | ✅ 0 matches |
| Hardcoded secrets / tokens en src | ✅ ninguno |
| Passwords con bcrypt (hash + compare) | ✅ |
| `Authorization: Bearer` requerido en todas las rutas salvo register/login | ✅ 401 sin token |

## ✅ 6. Deployment

| Target | Result | Details |
|--------|--------|---------|
| GitHub repo | ✅ | `cristiancode-hermes/2026-08-12-gridgauge`, README + .gitignore, repo limpio (113 archivos, 404 KB .git) |
| Caddy subdomain | ✅ | `gridgauge.proyectos.cristiancode.dev` → 200 (SPA + `/api*` → :3057) |
| manage-apis.sh | ✅ | Registrado (3057/gridgauge/2026-08-12-gridgauge), 47 APIs alineadas |
| Landing page | ✅ | `proyectos.cristiancode.dev` categoría Productividad, JS OK, push `aa343ff` |
| Portfolio es/en/pt | ✅ | `cristiancode.dev/project/gridgauge/` + `/en/` + `/pt/` → 200, id 172, theme_gridgauge (default card, same as scanforge) |
| Screenshots | ✅ | `gridgauge.png` (88 KB) + `gridgauge-m.png` (43 KB) capturados del dashboard real con datos demo, verificados visualmente, live en cristiancode.dev |
| Excel tracker | ✅ | Fila 78 (GridGauge, puerto 3057, Full Stack) |

## Summary

**OVERALL: PASS ✅**

- 28/28 tests unitarios + 31/31 checks funcionales (endpoints + ciclo anomalía)
- 1 fix de robustez aplicado (`IsNull()` vs `null as any`), verificado con build + tests
- Flujo completo verificado en browser sobre el subdominio desplegado: login → dashboard con datos reales → 4 páginas → register browser → logout → guard
- Puerto 3057 (3046 del spec estaba ocupado por daymark en Caddyfile — se eligió puerto libre para no romper su reverse_proxy)
