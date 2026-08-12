import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReportsService } from '../../services/reports.service';
import { ToastService } from '../../services/toast.service';
import { Report } from '../../interfaces/models';
import { BarChartComponent, BarDatum } from '../../shared/bar-chart.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { BadgeComponent } from '../../shared/badge.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, BarChartComponent, SkeletonComponent, BadgeComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 class="page-title">Informes</h1>
        <p class="page-sub">Resumen mensual de consumo, coste y emisiones.</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <input class="input" type="month" [ngModel]="monthInput()" (ngModelChange)="setMonth($event)" style="width: 170px;" aria-label="Mes del informe" />
        <button class="btn btn-secondary" (click)="download()">Exportar CSV</button>
      </div>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else if (report(); as r) {
      <div class="grid-kpis">
        <div class="card">
          <div class="kpi-label">Consumo total</div>
          <div class="kpi-value">{{ r.totalConsumption.toFixed(1) }}<span style="font-size: 14px; color: var(--gg-faint); margin-left: 4px;">unid.</span></div>
        </div>
        <div class="card">
          <div class="kpi-label">Coste total</div>
          <div class="kpi-value">{{ r.totalCost.toFixed(2) }}<span style="font-size: 14px; color: var(--gg-faint); margin-left: 4px;">{{ r.currency }}</span></div>
        </div>
        <div class="card">
          <div class="kpi-label">Emisiones CO₂</div>
          <div class="kpi-value">{{ r.co2.toFixed(1) }}<span style="font-size: 14px; color: var(--gg-faint); margin-left: 4px;">kg</span></div>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Consumo por suministro — {{ r.monthLabel }}</h2>
        <app-bar-chart [data]="bars()" ariaLabel="Consumo por suministro" />
      </div>

      <div class="card" style="margin-top: 16px; padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Suministro</th><th class="num">Consumo</th><th class="num">Coste</th><th class="num">CO₂ (kg)</th></tr>
            </thead>
            <tbody>
              @for (u of r.byUtility; track u.utility) {
                <tr>
                  <td><app-badge kind="utility" [utility]="u.utility" [label]="u.label" /></td>
                  <td class="num">{{ u.consumption.toFixed(1) }}</td>
                  <td class="num">{{ u.cost.toFixed(2) }} {{ r.currency }}</td>
                  <td class="num">{{ u.co2.toFixed(1) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (r.yoy.length) {
        <div class="card" style="margin-top: 16px;">
          <h2 class="section-title">Comparativa interanual</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px;">
            @for (y of r.yoy; track y.month) {
              <div>
                <div style="font-size: 12px; color: var(--gg-faint);">{{ y.month }}</div>
                <div class="mono" style="font-size: 18px; font-weight: 600;">{{ y.value.toFixed(1) }}</div>
              </div>
            }
          </div>
        </div>
      }
    }
  `,
})
export class ReportsPageComponent implements OnInit {
  private readonly service = inject(ReportsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly report = signal<Report | null>(null);
  readonly monthInput = signal(new Date().toISOString().slice(0, 7));

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    const [y, m] = this.monthInput().split('-').map(Number);
    try {
      this.report.set(await this.service.get(y, m));
    } finally {
      this.loading.set(false);
    }
  }

  async setMonth(v: string): Promise<void> {
    this.monthInput.set(v);
    this.loading.set(true);
    await this.load();
  }

  bars(): BarDatum[] {
    const r = this.report();
    if (!r) return [];
    return r.byUtility.map((u) => ({
      label: u.utility === 'electricity' ? 'Elec.' : u.label,
      value: u.consumption,
      colorClass: u.utility === 'water' ? 'water' : u.utility === 'gas' ? 'gas' : 'bar',
    }));
  }

  async download(): Promise<void> {
    const [y, m] = this.monthInput().split('-').map(Number);
    try {
      const blob = await this.service.exportCsv(y, m);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gridgauge-${y}-${String(m).padStart(2, '0')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast.success('Informe exportado');
    } catch {
      this.toast.error('No se pudo exportar');
    }
  }

}
