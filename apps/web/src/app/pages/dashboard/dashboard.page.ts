import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { MetersService } from '../../services/meters.service';
import { DashboardSummary, Kpi, RawKpi } from '../../interfaces/models';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, KpiCardComponent, LineChartComponent, BadgeComponent, SkeletonComponent, EmptyStateComponent],
  template: `
    <h1 class="page-title">Panel</h1>
    <p class="page-sub">Resumen del consumo del hogar · {{ monthLabel() }}</p>

    @if (loading()) {
      <div class="grid-kpis">
        @for (i of [1, 2, 3]; track i) {
          <div class="card"><div class="skeleton" style="height: 14px; width: 60%;"></div><div class="skeleton" style="height: 30px; width: 45%; margin-top: 10px;"></div></div>
        }
      </div>
      <app-skeleton [rows]="4" />
    } @else if (summary(); as s) {
      <div class="grid-kpis">
        @for (kpi of s.kpis; track kpi.label) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <div class="card">
        <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px;">
          <h2 class="section-title">Consumo últimos 30 días</h2>
          <span style="font-size: 12.5px; color: var(--gg-faint); font-family: var(--font-mono);">kWh</span>
        </div>
        <app-line-chart [points]="series()" [color]="'var(--gg-accent)'" ariaLabel="Consumo de los últimos 30 días" />
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px;">
        <div class="card">
          <h2 class="section-title">Presupuesto del mes</h2>
          @if (s.budgetGlobal; as bg) {
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
              <span class="mono" style="font-size: 24px; font-weight: 600;">{{ bg.spent.toFixed(2) }} {{ s.currency }}</span>
              <span style="color: var(--gg-faint); font-size: 13px;">de {{ bg.amount.toFixed(2) }}</span>
            </div>
            <div class="progress-track"><div class="progress-fill {{ progressClass(bg.usedPct) }}" [style.width.%]="Math.min(bg.usedPct, 100)"></div></div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 12.5px; color: var(--gg-muted);">
              <span>{{ bg.usedPct.toFixed(0) }}% usado</span>
              <span>Proyección {{ bg.projection.toFixed(0) }}</span>
            </div>
            <div style="margin-top: 14px;">
              <a routerLink="/budgets" class="btn btn-secondary btn-sm">Gestionar presupuestos</a>
            </div>
          } @else {
            <app-empty-state icon="€" title="Sin presupuesto" message="Define un presupuesto mensual para seguir tu gasto." actionLabel="Crear presupuesto" (action)="router.navigate(['/budgets'])" />
          }
        </div>

        <div class="card">
          <h2 class="section-title">Anomalías abiertas</h2>
          @if (s.anomaliesOpen.length > 0) {
            <div style="display: flex; align-items: center; gap: 10px; padding: 12px 0;">
              <span class="badge badge-warning"><span class="dot"></span>{{ s.anomaliesOpen.length }} sin revisar</span>
            </div>
            <a routerLink="/anomalies" class="btn btn-secondary btn-sm">Revisar anomalías</a>
          } @else {
            <app-empty-state icon="✓" title="Todo en orden" message="No hay anomalías pendientes." />
          }
        </div>
      </div>

      <div class="card" style="margin-top: 16px;">
        <h2 class="section-title">Últimas lecturas</h2>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Contador</th><th>Periodo</th><th class="num">Valor</th><th>Fuente</th><th></th></tr>
            </thead>
            <tbody>
              @for (r of s.recentReadings; track r.id) {
                <tr>
                  <td style="font-weight: 500;">{{ r.meterName }}</td>
                  <td style="color: var(--gg-muted); font-family: var(--font-mono); font-size: 13px;">{{ fmtDate(r.periodStart) }}</td>
                  <td class="num">{{ r.value.toFixed(2) }} <span style="color: var(--gg-faint);">{{ unitOf(r) }}</span></td>
                  <td><app-badge kind="plain" [label]="sourceLabel(r.source)" /></td>
                  <td><a [routerLink]="['/meters', r.meterId]" style="font-size: 13px;">Ver contador →</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly router = inject(Router);
  private readonly dash = inject(DashboardService);
  private readonly meters = inject(MetersService);
  readonly Math = Math;

  readonly loading = signal(true);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly series = signal<Array<{ date: string; value: number }>>([]);

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const s = await this.dash.summary();
      this.summary.set({
        ...s,
        kpis: s.kpis.map((k) => this.toKpi(k as unknown as RawKpi)),
      });
      const meters = await this.meters.list();
      if (meters.length) {
        const ser = await this.meters.series(meters[0].id, 30);
        this.series.set(ser.points);
      }
    } finally {
      this.loading.set(false);
    }
  }

  private toKpi(k: RawKpi): Kpi {
    return {
      label: k.label,
      value: k.month,
      unit: k.unit,
      deltaPct: k.deltaPct,
      utilityType: k.utility,
    };
  }

  monthLabel(): string {
    return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  progressClass(pct: number): string {
    if (pct > 100) return 'over';
    if (pct > 80) return 'warn';
    return 'ok';
  }

  fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  sourceLabel(s: string): string {
    return s === 'manual' ? 'Manual' : s === 'import' ? 'Importada' : 'API';
  }

  unitOf(r: any): string {
    return r.unit ?? (r.utility === 'water' || r.utility === 'gas' ? 'm³' : 'kWh');
  }
}
