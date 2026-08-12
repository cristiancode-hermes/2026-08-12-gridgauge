import { Component, input } from '@angular/core';
import { Kpi } from '../interfaces/models';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  template: `
    <div class="card" style="padding: 18px 20px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span class="kpi-label">{{ kpi().label }}</span>
        @if (kpi().utilityType) {
          <span class="badge badge-utility badge-{{ kpi().utilityType }}"><span class="dot"></span></span>
        }
      </div>
      <div class="kpi-value" [class.mono]="kpi().mono !== false">{{ formatValue() }}<span style="font-size: 14px; color: var(--gg-faint); margin-left: 4px;">{{ kpi().unit }}</span></div>
      @if (kpi().deltaPct !== null && kpi().deltaPct !== undefined) {
        <div class="kpi-delta {{ deltaClass() }}">
          {{ kpi().deltaPct! > 0 ? '▲' : kpi().deltaPct! < 0 ? '▼' : '—' }} {{ Math.abs(kpi().deltaPct!).toFixed(1) }}% vs mes anterior
        </div>
      }
    </div>
  `,
})
export class KpiCardComponent {
  readonly kpi = input.required<Kpi>();
  readonly Math = Math;

  formatValue(): string {
    const v = this.kpi().value;
    if (Number.isInteger(v)) return v.toLocaleString('es-ES');
    if (Math.abs(v) >= 1000) return v.toLocaleString('es-ES', { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 100) return v.toFixed(1);
    return v.toFixed(2);
  }

  deltaClass(): string {
    const d = this.kpi().deltaPct;
    if (d === null || d === undefined) return 'flat';
    if (d > 0.5) return 'down';
    if (d < -0.5) return 'up';
    return 'flat';
  }
}
