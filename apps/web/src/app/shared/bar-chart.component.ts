import { Component, input } from '@angular/core';

export interface BarDatum {
  label: string;
  value: number;
  colorClass: 'bar' | 'water' | 'gas' | 'muted';
}

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  template: `
    <div class="chart-box">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="ariaLabel()">
        @for (gy of gridYs; track gy) {
          <line class="chart-grid-line" [attr.x1]="padL" [attr.x2]="W - padR" [attr.y1]="gy" [attr.y2]="gy" />
          <text class="chart-axis-label" [attr.x]="padL - 6" [attr.y]="gy + 4" text-anchor="end">{{ yLabel(gy) }}</text>
        }
        @for (b of bars; track b.x) {
          <rect class="bar {{ b.datum.colorClass }}" [attr.x]="b.x" [attr.y]="b.y" [attr.width]="b.w" [attr.height]="b.h" rx="3" />
          <text class="chart-axis-label" [attr.x]="b.x + b.w / 2" [attr.y]="H - 6" text-anchor="middle">{{ b.datum.label }}</text>
        }
      </svg>
    </div>
  `,
})
export class BarChartComponent {
  readonly data = input<BarDatum[]>([]);
  readonly ariaLabel = input('Gráfico de barras');

  readonly W = 640;
  readonly H = 260;
  readonly padL = 52;
  readonly padR = 16;
  readonly padT = 16;
  readonly padB = 28;

  get gridYs(): number[] {
    return [0.25, 0.5, 0.75, 1].map((f) => this.padT + f * (this.H - this.padT - this.padB));
  }

  get maxValue(): number {
    const d = this.data();
    if (!d.length) return 1;
    return Math.max(...d.map((x) => x.value), 0.001) * 1.12;
  }

  yLabel(y: number): string {
    const f = 1 - (y - this.padT) / (this.H - this.padT - this.padB);
    const v = this.maxValue * f;
    return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);
  }

  get bars(): Array<{ x: number; y: number; w: number; h: number; datum: BarDatum }> {
    const d = this.data();
    if (!d.length) return [];
    const n = d.length;
    const slot = (this.W - this.padL - this.padR) / n;
    const w = Math.min(56, slot * 0.55);
    return d.map((datum, i) => {
      const h = (datum.value / this.maxValue) * (this.H - this.padT - this.padB);
      return {
        x: this.padL + i * slot + (slot - w) / 2,
        y: this.padT + (this.H - this.padT - this.padB) - h,
        w,
        h,
        datum,
      };
    });
  }
}
