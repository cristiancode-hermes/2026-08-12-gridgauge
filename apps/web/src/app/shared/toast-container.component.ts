import { Component, inject } from '@angular/core';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast {{ t.type }}" (click)="toast.dismiss(t.id)">
          {{ t.text }}
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  readonly toast = inject(ToastService);
}
