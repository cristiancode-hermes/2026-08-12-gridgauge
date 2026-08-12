import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetsService } from '../../services/budgets.service';
import { MetersService } from '../../services/meters.service';
import { ToastService } from '../../services/toast.service';
import { Budget, Meter } from '../../interfaces/models';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [FormsModule, BadgeComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 class="page-title">Presupuestos</h1>
        <p class="page-sub">Controla el gasto mensual por contador.</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <input class="input" type="month" [ngModel]="period()" (ngModelChange)="setPeriod($event)" style="width: 170px;" aria-label="Mes" />
        <button class="btn btn-primary" (click)="openCreate()">+ Nuevo</button>
      </div>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else if (!budgets().length) {
      <div class="card"><app-empty-state icon="€" title="Sin presupuestos" message="Define un presupuesto para este mes y sigue tu gasto en tiempo real." actionLabel="Crear presupuesto" (action)="openCreate()" /></div>
    } @else {
      <div class="card" style="padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Contador</th><th class="num">Presupuesto</th><th class="num">Gastado</th><th style="width: 26%;">Progreso</th><th class="num">Proyección</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (b of budgets(); track b.id) {
                <tr>
                  <td style="font-weight: 500;">{{ b.meterName }}</td>
                  <td class="num">{{ b.amount.toFixed(2) }} €</td>
                  <td class="num">{{ (b.spent ?? 0).toFixed(2) }} €</td>
                  <td>
                    <div class="progress-track"><div class="progress-fill {{ progressClass(b) }}" [style.width.%]="Math.min(b.usedPct ?? 0, 100)"></div></div>
                    <div style="font-size: 11.5px; color: var(--gg-faint); margin-top: 3px;">{{ (b.usedPct ?? 0).toFixed(0) }}%</div>
                  </td>
                  <td class="num">{{ (b.projection ?? 0).toFixed(0) }} €</td>
                  <td><app-badge kind="status" [status]="b.status ?? 'on_track'" [label]="statusLabel(b.status)" /></td>
                  <td>
                    <div class="row-actions">
                      <button class="btn btn-ghost btn-sm" (click)="openEdit(b)">Editar</button>
                      <button class="btn btn-ghost btn-sm" (click)="remove(b)">Borrar</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (showModal()) {
      <app-modal [title]="editing() ? 'Editar presupuesto' : 'Nuevo presupuesto'" (close)="showModal.set(false)">
        <form (ngSubmit)="save()">
          <div class="field">
            <label>Contador</label>
            <select class="input" [(ngModel)]="form.meterId" name="meterId" [disabled]="!!editing()" required>
              <option value="" disabled>Selecciona…</option>
              @for (m of meters(); track m.id) {
                <option [value]="m.id">{{ m.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Mes</label>
            <input class="input" type="month" [(ngModel)]="form.period" name="period" [disabled]="!!editing()" required />
          </div>
          <div class="field">
            <label>Importe (€)</label>
            <input class="input" type="number" step="0.01" min="1" [(ngModel)]="form.amount" name="amount" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="showModal.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="!form.meterId || !form.period || form.amount <= 0">Guardar</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class BudgetsPageComponent implements OnInit {
  private readonly service = inject(BudgetsService);
  private readonly metersSvc = inject(MetersService);
  private readonly toast = inject(ToastService);

  readonly Math = Math;
  readonly loading = signal(true);
  readonly budgets = signal<Budget[]>([]);
  readonly meters = signal<Meter[]>([]);
  readonly period = signal(new Date().toISOString().slice(0, 7));
  readonly showModal = signal(false);
  readonly editing = signal<Budget | null>(null);

  readonly form = {
    meterId: '',
    period: '',
    amount: 50,
  };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.budgets.set(await this.service.list(this.period()));
    } finally {
      this.loading.set(false);
    }
  }

  async setPeriod(p: string): Promise<void> {
    this.period.set(p);
    this.loading.set(true);
    await this.load();
  }

  async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.meterId = '';
    this.form.period = this.period();
    this.form.amount = 50;
    this.meters.set(await this.metersSvc.list());
    this.showModal.set(true);
  }

  async openEdit(b: Budget): Promise<void> {
    this.editing.set(b);
    this.form.meterId = b.meterId;
    this.form.period = b.period;
    this.form.amount = b.amount;
    this.meters.set(await this.metersSvc.list());
    this.showModal.set(true);
  }

  async save(): Promise<void> {
    try {
      if (this.editing()) {
        await this.service.update(this.editing()!.id, { amount: Number(this.form.amount) });
        this.toast.success('Presupuesto actualizado');
      } else {
        await this.service.create({
          meterId: this.form.meterId,
          period: this.form.period,
          amount: Number(this.form.amount),
        });
        this.toast.success('Presupuesto creado');
      }
      this.showModal.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error(e?.error?.message === 'BUDGET_PERIOD_DUPLICATE' ? 'Ya existe un presupuesto para ese contador y mes' : 'No se pudo guardar');
    }
  }

  async remove(b: Budget): Promise<void> {
    if (!confirm(`¿Borrar el presupuesto de ${b.meterName} (${b.period})?`)) return;
    try {
      await this.service.remove(b.id);
      this.toast.success('Presupuesto borrado');
      await this.load();
    } catch {
      this.toast.error('No se pudo borrar');
    }
  }

  progressClass(b: Budget): string {
    const pct = b.usedPct ?? 0;
    if (pct > 100) return 'over';
    if (pct > 80) return 'warn';
    return 'ok';
  }

  statusLabel(s?: string): string {
    switch (s) {
      case 'exceeded': return 'Superado';
      case 'at_risk': return 'En riesgo';
      case 'on_track': return 'En camino';
      default: return '—';
    }
  }
}
