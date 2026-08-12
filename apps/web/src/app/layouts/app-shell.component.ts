import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { ToastContainerComponent } from '../shared/toast-container.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">⚡</div>
          <span class="brand-name">GridGauge</span>
        </div>
        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" [routerLinkActiveOptions]="{ exact: true }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <span class="nav-label">Panel</span>
          </a>
          <a routerLink="/meters" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>
            <span class="nav-label">Contadores</span>
          </a>
          <a routerLink="/tariffs" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="7" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="9" cy="18" r="2" fill="currentColor"/></svg>
            <span class="nav-label">Tarifas</span>
          </a>
          <a routerLink="/budgets" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span class="nav-label">Presupuestos</span>
          </a>
          <a routerLink="/anomalies" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span class="nav-label">Anomalías</span>
          </a>
          <a routerLink="/devices" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            <span class="nav-label">Dispositivos</span>
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span class="nav-label">Informes</span>
          </a>
          <a routerLink="/settings" routerLinkActive="active" class="nav-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span class="nav-label">Ajustes</span>
          </a>
        </nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <div style="font-size: 13px; color: var(--gg-muted);">
            Monitor de energía del hogar
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn btn-ghost btn-icon" (click)="theme.toggle()" [attr.aria-label]="theme.isLight() ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'">
              @if (theme.isLight()) {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              } @else {
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              }
            </button>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--gg-surface-2); color: var(--gg-accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
                {{ (auth.user()?.displayName ?? 'U').charAt(0).toUpperCase() }}
              </div>
              <button class="btn btn-ghost btn-sm" (click)="auth.logout()">Salir</button>
            </div>
          </div>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-toast-container />
  `,
})
export class AppShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.user()) {
      void this.auth.loadProfile();
    }
  }
}
