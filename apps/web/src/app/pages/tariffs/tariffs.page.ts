import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TariffsService, TariffDto } from '../../services/tariffs.service';
import { ToastService } from '../../services/toast.service';
import { Tariff } from '../../interfaces/models';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-tariffs',
  standalone: true,
  imports: [FormsModule, BadgeComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 class="page-title">Tarifas</h1>
        <p class="page-sub">Precios por tramo, discriminación horaria y cuotas fijas.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ Nueva tarifa</button>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else if (!tariffs().length) {
      <div class="card"><app-empty-state icon="⌗" title="Sin tarifas" message="Crea una tarifa para calcular el coste real del consumo." actionLabel="Crear tarifa" (action)="openCreate()" /></div>
    } @else {
      <div class="card" style="padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Tarifa</th><th>Tipo</th><th class="num">Precio base</th><th class="num">Cuota fija</th><th>Estructura</th><th>Uso</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (t of tariffs(); track t.id) {
                <tr>
                  <td style="font-weight: 500;">{{ t.name }}</td>
                  <td><app-badge kind="utility" [utility]="t.utilityType" [label]="utilityLabel(t.utilityType)" /></td>
                  <td class="num">{{ t.unitPrice.toFixed(3) }} €</td>
                  <td class="num">{{ t.fixedFee.toFixed(2) }} €</td>
                  <td style="color: var(--gg-muted); font-size: 13px;">{{ structure(t) }}</td>
                  <td style="color: var(--gg-muted);">{{ t.meterCount ? t.meterCount + ' contador' + (t.meterCount > 1 ? 'es' : '') : '—' }}</td>
                  <td>@if (t.active) { <app-badge kind="status" status="on_track" label="Activa" /> } @else { <app-badge kind="plain" label="Inactiva" /> }</td>
                  <td>
                    <div class="row-actions">
                      <button class="btn btn-ghost btn-sm" (click)="openEdit(t)">Editar</button>
                      <button class="btn btn-ghost btn-sm" (click)="duplicate(t)">Duplicar</button>
                      <button class="btn btn-ghost btn-sm" (click)="remove(t)">Borrar</button>
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
      <app-modal [title]="editing() ? 'Editar tarifa' : 'Nueva tarifa'" (close)="showModal.set(false)">
        <form (ngSubmit)="save()">
          <div class="field">
            <label>Nombre</label>
            <input class="input" [(ngModel)]="form.name" name="name" required placeholder="Hogar 2.0 TD" />
          </div>
          <div class="field">
            <label>Tipo de suministro</label>
            <select class="input" [(ngModel)]="form.utilityType" name="utilityType" [disabled]="!!editing()">
              <option value="electricity">Electricidad</option>
              <option value="water">Agua</option>
              <option value="gas">Gas</option>
            </select>
          </div>
          <div class="field">
            <label>Precio base (€/unidad)</label>
            <input class="input" type="number" step="0.001" [(ngModel)]="form.unitPrice" name="unitPrice" required />
          </div>
          <div class="field">
            <label>Cuota fija mensual (€)</label>
            <input class="input" type="number" step="0.01" [(ngModel)]="form.fixedFee" name="fixedFee" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="showModal.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="!form.name">Guardar</button>
          </div>
          <p style="font-size: 12.5px; color: var(--gg-faint); margin-top: 12px;">
            Los tramos progresivos y la discriminación horaria se editan desde la API (Swagger) o el seed.
          </p>
        </form>
      </app-modal>
    }
  `,
})
export class TariffsPageComponent implements OnInit {
  private readonly service = inject(TariffsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly tariffs = signal<Tariff[]>([]);
  readonly showModal = signal(false);
  readonly editing = signal<Tariff | null>(null);

  readonly form = {
    name: '',
    utilityType: 'electricity',
    unitPrice: 0.15,
    fixedFee: 0,
  };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.tariffs.set(await this.service.list());
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.name = '';
    this.form.utilityType = 'electricity';
    this.form.unitPrice = 0.15;
    this.form.fixedFee = 0;
    this.showModal.set(true);
  }

  openEdit(t: Tariff): void {
    this.editing.set(t);
    this.form.name = t.name;
    this.form.utilityType = t.utilityType;
    this.form.unitPrice = t.unitPrice;
    this.form.fixedFee = t.fixedFee;
    this.showModal.set(true);
  }

  async save(): Promise<void> {
    const dto: TariffDto = {
      name: this.form.name,
      utilityType: this.form.utilityType,
      unitPrice: Number(this.form.unitPrice),
      fixedFee: Number(this.form.fixedFee) || 0,
    };
    try {
      if (this.editing()) {
        await this.service.update(this.editing()!.id, dto);
        this.toast.success('Tarifa actualizada');
      } else {
        await this.service.create(dto);
        this.toast.success('Tarifa creada');
      }
      this.showModal.set(false);
      await this.load();
    } catch (e: any) {
      this.toast.error(e?.error?.message === 'TARIFF_IN_USE' ? 'La tarifa está en uso' : 'No se pudo guardar');
    }
  }

  async duplicate(t: Tariff): Promise<void> {
    try {
      await this.service.duplicate(t.id);
      this.toast.success('Tarifa duplicada');
      await this.load();
    } catch {
      this.toast.error('No se pudo duplicar');
    }
  }

  async remove(t: Tariff): Promise<void> {
    if (!confirm(`¿Borrar la tarifa «${t.name}»?`)) return;
    try {
      await this.service.remove(t.id);
      this.toast.success('Tarifa borrada');
      await this.load();
    } catch (e: any) {
      this.toast.error(e?.error?.message === 'TARIFF_IN_USE' ? 'No se puede borrar: hay contadores con esta tarifa' : 'No se pudo borrar');
    }
  }

  utilityLabel(u: string): string {
    return u === 'electricity' ? 'Electricidad' : u === 'water' ? 'Agua' : 'Gas';
  }

  structure(t: Tariff): string {
    const parts: string[] = [];
    if (t.tiers?.length) parts.push(`${t.tiers.length} tramos`);
    if (t.peakOffPeak?.enabled) parts.push('punta/valle');
    return parts.length ? parts.join(' + ') : '—';
  }
}
