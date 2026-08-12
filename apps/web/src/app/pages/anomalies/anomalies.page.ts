import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnomaliesService } from '../../services/anomalies.service';
import { ToastService } from '../../services/toast.service';
import { Anomaly } from '../../interfaces/models';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';

@Component({
  selector: 'app-anomalies',
  standalone: true,
  imports: [FormsModule, BadgeComponent, SkeletonComponent, EmptyStateComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 class="page-title">Anomalías</h1>
        <p class="page-sub">Detección de picos, ausencia de datos y consumo anómalo.</p>
      </div>
      <button class="btn btn-secondary" (click)="runDetect()">Ejecutar detectores</button>
    </div>

    <div class="filters">
      <select class="input" [ngModel]="filters.status" (ngModelChange)="setFilter('status', $event)" style="width: 160px;" aria-label="Estado">
        <option value="open">Abiertas</option>
        <option value="resolved">Resueltas</option>
      </select>
      <select class="input" [ngModel]="filters.severity" (ngModelChange)="setFilter('severity', $event)" style="width: 160px;" aria-label="Severidad">
        <option value="">Toda severidad</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
      <select class="input" [ngModel]="filters.type" (ngModelChange)="setFilter('type', $event)" style="width: 180px;" aria-label="Tipo">
        <option value="">Todos los tipos</option>
        <option value="spike">Pico de consumo</option>
        <option value="no_data">Sin lecturas</option>
        <option value="surge">Subida sostenida</option>
        <option value="device_usage">Uso de dispositivo</option>
        <option value="inactive">Contador inactivo</option>
      </select>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="5" />
    } @else if (!items().length) {
      <div class="card"><app-empty-state icon="✓" title="Sin anomalías" message="No hay {{ filters.status === 'resolved' ? 'anomalías resueltas' : 'anomalías abiertas' }}." /></div>
    } @else {
      <div class="card" style="padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Tipo</th><th>Contador</th><th>Detectada</th><th class="num">Esperado</th><th class="num">Real</th><th class="num">Δ%</th><th>Severidad</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td style="font-weight: 500;">{{ typeLabel(a.type) }}</td>
                  <td style="color: var(--gg-muted);">{{ a.meter?.name || '—' }}</td>
                  <td style="font-family: var(--font-mono); font-size: 12.5px; color: var(--gg-muted);">{{ fmt(a.detectedAt) }}</td>
                  <td class="num">{{ a.expectedValue?.toFixed(1) ?? '—' }}</td>
                  <td class="num">{{ a.actualValue?.toFixed(1) ?? '—' }}</td>
                  <td class="num">{{ a.deviationPct ? a.deviationPct.toFixed(1) + '%' : '—' }}</td>
                  <td><app-badge kind="severity" [severity]="a.severity" [label]="sevLabel(a.severity)" /></td>
                  <td>@if (a.resolvedAt) { <app-badge kind="status" status="resolved" label="Resuelta" /> } @else { <app-badge kind="status" status="open" label="Abierta" /> }</td>
                  <td>
                    <div class="row-actions">
                      @if (!a.resolvedAt) {
                        <button class="btn btn-ghost btn-sm" (click)="resolve(a)">Resolver</button>
                        <button class="btn btn-ghost btn-sm" (click)="dismiss(a)">Descartar</button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
})
export class AnomaliesPageComponent implements OnInit {
  private readonly service = inject(AnomaliesService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly items = signal<Anomaly[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);

  readonly filters = { status: 'open', severity: '', type: '' };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const res = await this.service.list({
        status: this.filters.status,
        severity: this.filters.severity || undefined,
        type: this.filters.type || undefined,
        page: this.page(),
        limit: 20,
      });
      this.items.set(res.items);
      this.total.set(res.total);
    } finally {
      this.loading.set(false);
    }
  }

  async setFilter(key: 'status' | 'severity' | 'type', value: string): Promise<void> {
    this.filters[key] = value;
    this.page.set(1);
    this.loading.set(true);
    await this.load();
  }

  async runDetect(): Promise<void> {
    try {
      const res = await this.service.detect();
      this.toast.info(`Detectores: ${res.created} creadas, ${res.escalated} escaladas, ${res.autoResolved} auto-resueltas`);
      await this.load();
    } catch {
      this.toast.error('Error al ejecutar detectores');
    }
  }

  async resolve(a: Anomaly): Promise<void> {
    const note = prompt('Nota de resolución (opcional):');
    if (note === null) return;
    try {
      await this.service.resolve(a.id, note || undefined);
      this.toast.success('Anomalía resuelta');
      await this.load();
    } catch {
      this.toast.error('No se pudo resolver');
    }
  }

  async dismiss(a: Anomaly): Promise<void> {
    try {
      await this.service.dismiss(a.id);
      this.toast.success('Anomalía descartada');
      await this.load();
    } catch {
      this.toast.error('No se pudo descartar');
    }
  }

  fmt(iso: string): string {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  typeLabel(t: string): string {
    switch (t) {
      case 'spike': return 'Pico';
      case 'no_data': return 'Sin lecturas';
      case 'surge': return 'Subida sostenida';
      case 'device_usage': return 'Uso dispositivo';
      case 'inactive': return 'Inactivo';
      default: return t;
    }
  }

  sevLabel(s: string): string {
    return s === 'critical' ? 'Critical' : s === 'warning' ? 'Warning' : 'Info';
  }
}
