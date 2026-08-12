import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <h1 class="auth-title">Crear cuenta</h1>
    <p class="auth-sub">Empieza a monitorizar tu consumo.</p>
    <form (ngSubmit)="submit()">
      <div class="field">
        <label for="displayName">Nombre</label>
        <input id="displayName" class="input" type="text" name="displayName" [(ngModel)]="displayName" required placeholder="Mi hogar" />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="email" placeholder="tu@email.com" />
      </div>
      <div class="field">
        <label for="password">Contraseña</label>
        <input id="password" class="input" type="password" name="password" [(ngModel)]="password" required minlength="8" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" [disabled]="loading()" style="width: 100%;">
          {{ loading() ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </div>
    </form>
    <div class="auth-switch">
      ¿Ya tienes cuenta? <a routerLink="/login">Entra</a>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly displayName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);

  async submit(): Promise<void> {
    if (!this.email() || !this.password() || !this.displayName()) return;
    this.loading.set(true);
    try {
      await this.auth.register(this.email(), this.password(), this.displayName());
      this.toast.success('Cuenta creada');
      await this.router.navigate(['/dashboard']);
    } catch (e: any) {
      const msg = e?.error?.message === 'EMAIL_IN_USE' ? 'Ese email ya está registrado' : 'No se pudo crear la cuenta';
      this.toast.error(msg);
    } finally {
      this.loading.set(false);
    }
  }
}
