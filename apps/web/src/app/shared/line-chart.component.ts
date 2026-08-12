import { Component, input } from '@angular/core';
import { SeriesPoint } from '../interfaces/models';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    <div class="chart-box">
      @if (points().length < 2) {
        <div class="empty-state" style="padding: 40px;">
          <div class="empty-icon">∿</div>
          <p style="margin: 0;">Datos insuficientes para graficar</p>
        </div>
      } @else {
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="ariaLabel()">
          @for (gy of gridYs; track gy) {
            <line class="chart-grid-line" [attr.x1]="padL" [attr.x2]="W - padR" [attr.y1]="gy" [attr.y2]="gy" />
            <text class="chart-axis-label" [attr.x]="padL - 6" [attr.y]="gy + 4" text-anchor="end">{{ yLabel(gy) }}</text>
          }
          <polyline
            [attr.points]="linePoints"
            fill="none"
            [attr.stroke]="color()"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="chart-path"
          />
          @for (p of dots; track p.x) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="color()" />
          }
          @for (lx of xLabels; track lx.x) {
            <text class="chart-axis-label" [attr.x]="lx.x" [attr.y]="H - 6" text-anchor="middle">{{ lx.label }}</text>
          }
        </svg>
      }
    </div>
  `,
})
export class LineChartComponent {
  readonly points = input<SeriesPoint[]>([]);
  readonly color = input('#FFB224');
  readonly ariaLabel = input('Gráfico de consumo');

  readonly W = 640;
  readonly H = 260;
  readonly padL = 52;
  readonly padR = 16;
  readonly padT = 16;
  readonly padB = 28;

  get gridYs(): number[] {
    return [0.2, 0.4, 0.6, 0.8].map((f) => this.padT + f * (this.H - this.padT - this.padB));
  }

  yLabel(y: number): string {
    const max = this.maxValue();
    const f = 1 - (y - this.padT) / (this.H - this.padT - this.padB);
    return this.compact(max * f);
  }

  get maxValue(): () => number {
    const pts = this.points();
    if (!pts.length) return () => 1;
    const m = Math.max(...pts.map((p) => p.value), 0.001);
    return () => (m > 0 ? m * 1.12 : 1);
  }

  get innerW(): number { return this.W - this.padL - this.padR; }
  get innerH(): number { return this.H - this.padT - this.padB; }

  get linePoints(): string {
    const pts = this.points();
    if (pts.length < 2) return '';
    const max = this.maxValue();
    return pts
      .map((p, i) => {
        const x = this.padL + (i / (pts.length - 1)) * this.innerW;
        const y = this.padT + this.innerH * (1 - p.value / max);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  get dots(): Array<{ x: number; y: number }> {
    const pts = this.points();
    if (pts.length < 2) return [];
    const max = this.maxValue();
    return pts.map((p, i) => ({
      x: this.padL + (i / (pts.length - 1)) * this.innerW,
      y: this.padT + this.innerH * (1 - p.value / max),
    }));
  }

  get xLabels(): Array<{ x: number; label: string }> {
    const pts = this.points();
    if (pts.length < 2) return [];
    const step = Math.max(1, Math.floor(pts.length / 6));
    const out: Array<{ x: number; label: string }> = [];
    for (let i = 0; i < pts.length; i += step) {
      const d = new Date(pts[i].date + 'T00:00:00Z');
      out.push({
        x: this.padL + (i / (pts.length - 1)) * this.innerW,
        label: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      });
    }
    return out;
  }

  private compact(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    if (n >= 100) return n.toFixed(0);
    return n.toFixed(1);
  }
}
