import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  private counter = 0;

  success(text: string): void { this.push('success', text); }
  error(text: string): void { this.push('error', text); }
  info(text: string): void { this.push('info', text); }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(type: ToastMessage['type'], text: string): void {
    const id = ++this.counter;
    this.toasts.update((list) => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), 4000);
  }
}
