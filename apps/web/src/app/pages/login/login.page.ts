import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1 class="auth-title">Entrar</h1>
    <p class="auth-sub">Accede a tu monitor de energía.</p>
    <form (ngSubmit)="submit()" autocomplete="off">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="off" placeholder="tu@email.com" />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required autocomplete="new-password" placeholder="••••••••" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" [disabled]="loading()" style="width: 100%;">
          {{ loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </div>
    </form>
    <div class="auth-demo">
      <strong>Cuenta de prueba con datos</strong><br />
      <code>casa@gridgauge.dev</code> · <code>demo1234</code>
    </div>
    <div class="auth-switch">
      ¿No tienes cuenta? <a routerLink="/register">Regístrate</a>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);

  async submit(): Promise<void> {
    if (!this.email() || !this.password()) return;
    this.loading.set(true);
    try {
      await this.auth.login(this.email(), this.password());
      this.toast.success('Sesión iniciada');
      await this.router.navigate(['/dashboard']);
    } catch {
      this.toast.error('Credenciales incorrectas');
    } finally {
      this.loading.set(false);
    }
  }
}
