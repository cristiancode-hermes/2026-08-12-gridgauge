import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="empty-state">
      <div class="empty-icon">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
      @if (actionLabel()) {
        <button class="btn btn-secondary" (click)="action.emit()">{{ actionLabel() }}</button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('▦');
  readonly title = input('');
  readonly message = input('');
  readonly actionLabel = input('');
  readonly action = output<void>();
}
