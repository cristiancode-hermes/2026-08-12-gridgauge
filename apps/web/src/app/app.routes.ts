import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./layouts/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPageComponent) },
    ],
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./layouts/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPageComponent) },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPageComponent) },
      { path: 'meters', loadComponent: () => import('./pages/meters/meters.page').then((m) => m.MetersPageComponent) },
      { path: 'meters/:id', loadComponent: () => import('./pages/meters/meter-detail.page').then((m) => m.MeterDetailPageComponent) },
      { path: 'tariffs', loadComponent: () => import('./pages/tariffs/tariffs.page').then((m) => m.TariffsPageComponent) },
      { path: 'budgets', loadComponent: () => import('./pages/budgets/budgets.page').then((m) => m.BudgetsPageComponent) },
      { path: 'anomalies', loadComponent: () => import('./pages/anomalies/anomalies.page').then((m) => m.AnomaliesPageComponent) },
      { path: 'devices', loadComponent: () => import('./pages/devices/devices.page').then((m) => m.DevicesPageComponent) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.page').then((m) => m.ReportsPageComponent) },
      { path: 'settings', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPageComponent) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
