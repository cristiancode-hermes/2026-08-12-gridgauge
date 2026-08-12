import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MetersService } from '../../services/meters.service';
import { ToastService } from '../../services/toast.service';
import { Meter, MeterStats, Reading } from '../../interfaces/models';
import { KpiCardComponent } from '../../shared/kpi-card.component';
import { LineChartComponent } from '../../shared/line-chart.component';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-meter-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, KpiCardComponent, LineChartComponent, BadgeComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <a routerLink="/meters" style="font-size: 13px; color: var(--gg-faint);">← Contadores</a>
        <h1 class="page-title" style="margin-top: 4px;">{{ meter()?.name }}</h1>
        <p class="page-sub">{{ meter()?.location || 'Sin ubicación' }} · {{ meter()?.serialNumber || 'sin nº de serie' }}</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button class="btn btn-secondary btn-sm" (click)="openReading()">+ Lectura</button>
        <button class="btn btn-secondary btn-sm" (click)="openImport()">Importar CSV</button>
      </div>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else {
      <div class="grid-kpis">
        @for (kpi of kpis(); track kpi.label) {
          <app-kpi-card [kpi]="kpi" />
        }
      </div>

      <div class="card">
        <h2 class="section-title">Serie {{ periodLabel() }}</h2>
        <app-line-chart [points]="series()" [color]="chartColor()" [attr.aria-label]="'Serie de consumo'" />
      </div>

      <div class="card" style="margin-top: 16px;">
        <h2 class="section-title">Lecturas</h2>
        @if (!readings().length) {
          <app-empty-state icon="∿" title="Sin lecturas" message="Añade la primera lectura manual o importa un CSV." actionLabel="Añadir lectura" (action)="openReading()" />
        } @else {
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>Periodo inicio</th><th>Periodo fin</th><th class="num">Valor</th><th>Fuente</th><th>Notas</th><th></th></tr></thead>
              <tbody>
                @for (r of readings(); track r.id) {
                  <tr>
                    <td style="font-family: var(--font-mono); font-size: 13px;">{{ fmt(r.periodStart) }}</td>
                    <td style="font-family: var(--font-mono); font-size: 13px; color: var(--gg-muted);">{{ fmt(r.periodEnd) }}</td>
                    <td class="num">{{ r.value.toFixed(2) }} <span style="color: var(--gg-faint);">{{ meter()?.unit }}</span></td>
                    <td><app-badge kind="plain" [label]="src(r.source)" /></td>
                    <td style="color: var(--gg-muted); font-size: 13px;">{{ r.notes || '—' }}</td>
                    <td><button class="btn btn-ghost btn-sm" (click)="removeReading(r)">Borrar</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }

    @if (showReading()) {
      <app-modal title="Nueva lectura" (close)="showReading.set(false)">
        <form (ngSubmit)="saveReading()">
          <div class="field">
            <label>Fecha inicio</label>
            <input class="input" type="datetime-local" [(ngModel)]="readingForm.periodStart" name="ps" required />
          </div>
          <div class="field">
            <label>Fecha fin</label>
            <input class="input" type="datetime-local" [(ngModel)]="readingForm.periodEnd" name="pe" required />
          </div>
          <div class="field">
            <label>Valor ({{ meter()?.unit }})</label>
            <input class="input" type="number" step="0.01" [(ngModel)]="readingForm.value" name="val" required />
          </div>
          <div class="field">
            <label>Notas</label>
            <input class="input" [(ngModel)]="readingForm.notes" name="notes" placeholder="Lectura semanal…" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="showReading.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary">Guardar</button>
          </div>
        </form>
      </app-modal>
    }

    @if (showImport()) {
      <app-modal title="Importar CSV" (close)="showImport.set(false)">
        <p style="font-size: 13.5px; color: var(--gg-muted); margin-top: 0;">
          Columnas: <code class="mono" style="color: var(--gg-ink);">period_start,period_end,value</code> · máx 500 filas.
        </p>
        <input class="input" type="file" accept=".csv,text/csv" (change)="onFile($event)" style="margin-bottom: 14px;" />
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" (click)="showImport.set(false)">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!importFile()" (click)="doImport()">Importar</button>
        </div>
      </app-modal>
    }
  `,
})
export class MeterDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(MetersService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly meter = signal<Meter | null>(null);
  readonly stats = signal<MeterStats | null>(null);
  readonly series = signal<Array<{ date: string; value: number }>>([]);
  readonly readings = signal<Reading[]>([]);
  readonly showReading = signal(false);
  readonly showImport = signal(false);
  readonly importFile = signal<File | null>(null);

  readonly readingForm = {
    periodStart: '',
    periodEnd: '',
    value: 0,
    notes: '',
  };

  private meterId = '';

  ngOnInit(): void {
    this.meterId = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const m = await this.service.get(this.meterId);
      this.meter.set(m);
      const [ser, stats, pages] = await Promise.all([
        this.service.series(this.meterId, 30),
        this.service.stats(this.meterId, new Date().toISOString().slice(0, 7)),
        this.service.readings(this.meterId, 1, 50),
      ]);
      this.series.set(ser.points);
      this.stats.set(stats);
      this.readings.set(pages.items);
    } finally {
      this.loading.set(false);
    }
  }

  kpis(): any[] {
    const s = this.stats();
    const m = this.meter();
    if (!s || !m) return [];
    return [
      { label: 'Consumo ' + s.period, value: s.consumption, unit: s.unit, deltaPct: s.deltaPct },
      { label: 'Coste ' + s.period, value: s.cost, unit: '€', deltaPct: s.prevCost ? ((s.cost - s.prevCost) / s.prevCost) * 100 : null },
      { label: 'Periodo anterior', value: s.prevPeriod, unit: s.unit, deltaPct: null },
      { label: 'Anomalías abiertas', value: m.openAnomalies ?? 0, unit: '', deltaPct: null, mono: false },
    ];
  }

  periodLabel(): string {
    return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  chartColor(): string {
    const u = this.meter()?.utilityType;
    return u === 'water' ? 'var(--gg-water)' : u === 'gas' ? 'var(--gg-gas)' : 'var(--gg-accent)';
  }

  fmt(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  src(s: string): string {
    return s === 'manual' ? 'Manual' : s === 'import' ? 'Importada' : 'API';
  }

  openReading(): void {
    this.readingForm.periodStart = new Date(Date.now() - 86400000).toISOString().slice(0, 16);
    this.readingForm.periodEnd = new Date().toISOString().slice(0, 16);
    this.readingForm.value = 0;
    this.readingForm.notes = '';
    this.showReading.set(true);
  }

  async saveReading(): Promise<void> {
    try {
      await this.service.addReading(this.meterId, {
        periodStart: new Date(this.readingForm.periodStart).toISOString(),
        periodEnd: new Date(this.readingForm.periodEnd).toISOString(),
        value: Number(this.readingForm.value),
        notes: this.readingForm.notes || undefined,
      });
      this.toast.success('Lectura guardada');
      this.showReading.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error(e?.error?.message === 'PERIOD_DUPLICATE' ? 'Ya existe una lectura en ese periodo' : 'No se pudo guardar');
    }
  }

  openImport(): void {
    this.importFile.set(null);
    this.showImport.set(true);
  }

  onFile(ev: Event): void {
    const el = ev.target as HTMLInputElement;
    if (el.files?.length) this.importFile.set(el.files[0]);
  }

  async doImport(): Promise<void> {
    const f = this.importFile();
    if (!f) return;
    try {
      const res = await this.service.bulkImport(this.meterId, f);
      this.toast.success(`Importadas ${res.imported}, omitidas ${res.skipped}`);
      this.showImport.set(false);
      await this.load();
    } catch {
      this.toast.error('Error al importar CSV');
    }
  }

  async removeReading(r: Reading): Promise<void> {
    if (!confirm(`¿Borrar lectura del ${this.fmt(r.periodStart)}?`)) return;
    try {
      await this.service.deleteReading(r.id);
      this.toast.success('Lectura borrada');
      await this.load();
    } catch {
      this.toast.error('No se pudo borrar');
    }
  }
}
