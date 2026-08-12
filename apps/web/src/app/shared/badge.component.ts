import { Component, input } from '@angular/core';
import { AnomalySeverity, UtilityType } from '../interfaces/models';

@Component({
  selector: 'app-badge',
  standalone: true,
  template: `
    @switch (kind()) {
      @case ('utility') {
        <span class="badge badge-utility badge-{{ utility() }}"><span class="dot"></span>{{ label() }}</span>
      }
      @case ('severity') {
        <span class="badge {{ severityClass() }}"><span class="dot"></span>{{ label() }}</span>
      }
      @case ('status') {
        <span class="badge {{ statusClass() }}"><span class="dot"></span>{{ label() }}</span>
      }
      @default {
        <span class="badge badge-muted">{{ label() }}</span>
      }
    }
  `,
})
export class BadgeComponent {
  readonly kind = input<'utility' | 'severity' | 'status' | 'plain'>('plain');
  readonly label = input('');
  readonly utility = input<UtilityType>('electricity');
  readonly severity = input<AnomalySeverity>('info');
  readonly status = input<string>('');

  severityClass(): string {
    switch (this.severity()) {
      case 'critical': return 'badge-danger';
      case 'warning': return 'badge-warning';
      case 'info': return 'badge-info';
      default: return 'badge-muted';
    }
  }

  statusClass(): string {
    switch (this.status()) {
      case 'exceeded': return 'badge-danger';
      case 'at_risk': return 'badge-warning';
      case 'on_track': return 'badge-success';
      case 'resolved': return 'badge-success';
      case 'open': return 'badge-warning';
      default: return 'badge-muted';
    }
  }
}
