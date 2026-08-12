import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="modal" role="dialog" [attr.aria-label]="title()" (click)="$event.stopPropagation()">
        <h3>{{ title() }}</h3>
        <ng-content />
      </div>
    </div>
  `,
})
export class ModalComponent {
  readonly title = input('');
  readonly close = output<void>();
}
