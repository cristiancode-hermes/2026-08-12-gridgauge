import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from '../shared/toast-container.component';

@Component({
  selector: 'app-auth-layout',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-brand">
          <div class="brand-mark">⚡</div>
          <span class="brand-name">GridGauge</span>
        </div>
        <router-outlet />
      </div>
    </div>
    <app-toast-container />
  `,
})
export class AuthLayoutComponent {}
