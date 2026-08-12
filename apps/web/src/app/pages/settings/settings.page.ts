import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SettingsService } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { SkeletonComponent } from '../../shared/skeleton.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, SkeletonComponent],
  template: `
    <h1 class="page-title">Ajustes</h1>
    <p class="page-sub">Perfil, factores de emisión y preferencias del detector.</p>

    @if (loading()) {
      <app-skeleton [rows]="3" />
    } @else {
      <div class="card">
        <h2 class="section-title">Perfil</h2>
        <form (ngSubmit)="saveProfile()">
          <div class="field">
            <label>Nombre</label>
            <input class="input" [(ngModel)]="profile.displayName" name="displayName" />
          </div>
          <div class="field">
            <label>Email</label>
            <input class="input" [(ngModel)]="profile.email" name="email" disabled />
          </div>
          <div class="field">
            <label>Moneda</label>
            <select class="input" [(ngModel)]="profile.currency" name="currency">
              <option value="EUR">EUR — €</option>
              <option value="USD">USD — $</option>
              <option value="GBP">GBP — £</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">Guardar perfil</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h2 class="section-title">Apariencia</h2>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <div style="font-weight: 500;">Tema</div>
            <div style="font-size: 13px; color: var(--gg-muted);">{{ theme.isLight() ? 'Claro' : 'Oscuro (por defecto)' }}</div>
          </div>
          <button class="btn btn-secondary" (click)="theme.toggle()">Cambiar a {{ theme.isLight() ? 'oscuro' : 'claro' }}</button>
        </div>
      </div>

      <div class="card">
        <h2 class="section-title">Factores de emisión CO₂ (kg/unidad)</h2>
        <form (ngSubmit)="saveCo2()">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
            <div class="field">
              <label>Electricidad</label>
              <input class="input" type="number" step="0.01" [(ngModel)]="co2.electricity" name="co2e" />
            </div>
            <div class="field">
              <label>Agua</label>
              <input class="input" type="number" step="0.01" [(ngModel)]="co2.water" name="co2w" />
            </div>
            <div class="field">
              <label>Gas</label>
              <input class="input" type="number" step="0.01" [(ngModel)]="co2.gas" name="co2g" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">Guardar factores</button>
          </div>
        </form>
      </div>

      <div class="card">
        <h2 class="section-title">Detector de anomalías</h2>
        <form (ngSubmit)="savePrefs()">
          <div class="field">
            <label>Umbral de pico (σ)</label>
            <input class="input" type="number" step="0.1" min="1" max="8" [(ngModel)]="prefs.spikeThresholdSigma" name="sigma" />
            <div style="font-size: 12px; color: var(--gg-faint);">Desviaciones estándar sobre la media histórica para marcar un pico.</div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">Guardar preferencias</button>
          </div>
        </form>
      </div>
    }
  `,
})
export class SettingsPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);
  readonly theme = inject(ThemeService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);

  readonly profile = { displayName: '', email: '', currency: 'EUR' };
  readonly co2 = { electricity: 0.21, water: 0.34, gas: 2.04 };
  readonly prefs = { spikeThresholdSigma: 2.5, quietWindow: { start: '23:00', end: '07:00' }, quietWindowEnabled: false };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const u = this.auth.user();
      if (!u) {
        await this.auth.loadProfile();
      }
      const user = this.auth.user();
      if (user) {
        this.profile.displayName = user.displayName ?? '';
        this.profile.email = user.email;
        this.profile.currency = user.currency ?? 'EUR';
        this.co2.electricity = Math.round((user.co2Factors?.electricity ?? 0.21) * 100) / 100;
        this.co2.water = Math.round((user.co2Factors?.water ?? 0.34) * 100) / 100;
        this.co2.gas = Math.round((user.co2Factors?.gas ?? 2.04) * 100) / 100;
        this.prefs.spikeThresholdSigma = user.prefs?.spikeThresholdSigma ?? 2.5;
        this.prefs.quietWindow = user.prefs?.quietWindow ?? { start: '23:00', end: '07:00' };
        this.prefs.quietWindowEnabled = user.prefs?.quietWindowEnabled ?? false;
      }
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(): Promise<void> {
    try {
      await this.auth.updateProfile({
        displayName: this.profile.displayName,
        currency: this.profile.currency,
      });
      this.toast.success('Perfil actualizado');
    } catch {
      this.toast.error('No se pudo guardar el perfil');
    }
  }

  async saveCo2(): Promise<void> {
    try {
      await this.settings.updateCo2({
        electricity: Number(this.co2.electricity),
        water: Number(this.co2.water),
        gas: Number(this.co2.gas),
      });
      this.toast.success('Factores CO₂ actualizados');
    } catch {
      this.toast.error('No se pudieron guardar los factores');
    }
  }

  async savePrefs(): Promise<void> {
    try {
      await this.settings.updatePrefs({
        spikeThresholdSigma: Number(this.prefs.spikeThresholdSigma),
      });
      this.toast.success('Preferencias actualizadas');
    } catch {
      this.toast.error('No se pudieron guardar las preferencias');
    }
  }
}
