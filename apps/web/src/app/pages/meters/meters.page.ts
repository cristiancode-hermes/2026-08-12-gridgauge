import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MetersService } from '../../services/meters.service';
import { TariffsService } from '../../services/tariffs.service';
import { ToastService } from '../../services/toast.service';
import { Meter, Tariff } from '../../interfaces/models';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-meters',
  standalone: true,
  imports: [RouterLink, FormsModule, BadgeComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
      <div>
        <h1 class="page-title">Contadores</h1>
        <p class="page-sub">Electricidad, agua y gas de tu hogar.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ Nuevo contador</button>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else if (!meters().length) {
      <div class="card"><app-empty-state icon="◉" title="Sin contadores" message="Añade tu primer contador para empezar a medir." actionLabel="Añadir contador" (action)="openCreate()" /></div>
    } @else {
      <div class="card" style="padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Contador</th><th>Tipo</th><th>Tarifa</th><th class="num">Mes actual</th><th class="num">Coste</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (m of meters(); track m.id) {
                <tr>
                  <td style="font-weight: 500;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div class="meter-utility {{ m.utilityType }}"></div>
                      <div>
                        <a [routerLink]="['/meters', m.id]" style="color: inherit;">{{ m.name }}</a>
                        <div style="font-size: 12px; color: var(--gg-faint);">{{ m.location || 'Sin ubicación' }}</div>
                      </div>
                    </div>
                  </td>
                  <td><app-badge kind="utility" [utility]="m.utilityType" [label]="utilityLabel(m.utilityType)" /></td>
                  <td style="color: var(--gg-muted);">{{ m.tariff?.name || '—' }}</td>
                  <td class="num">{{ (m.monthConsumption ?? 0).toFixed(1) }} <span style="color: var(--gg-faint);">{{ m.unit }}</span></td>
                  <td class="num">{{ (m.monthCost ?? 0).toFixed(2) }} €</td>
                  <td>
                    @if (m.active) { <app-badge kind="status" status="on_track" label="Activo" /> }
                    @else { <app-badge kind="plain" label="Inactivo" /> }
                  </td>
                  <td>
                    <div class="row-actions">
                      <a [routerLink]="['/meters', m.id]" class="btn btn-ghost btn-sm">Ver</a>
                      <button class="btn btn-ghost btn-sm" (click)="openEdit(m)">Editar</button>
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
      <app-modal [title]="editing() ? 'Editar contador' : 'Nuevo contador'" (close)="closeModal()">
        <form (ngSubmit)="save()">
          <div class="field">
            <label>Nombre</label>
            <input class="input" [(ngModel)]="form.name" name="name" required placeholder="Contador principal" />
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
            <label>Ubicación</label>
            <input class="input" [(ngModel)]="form.location" name="location" placeholder="Cocina, garaje…" />
          </div>
          <div class="field">
            <label>Tarifa</label>
            <select class="input" [(ngModel)]="form.tariffId" name="tariffId">
              <option [ngValue]="null">Sin tarifa</option>
              @for (t of tariffs(); track t.id) {
                <option [ngValue]="t.id">{{ t.name }}</option>
              }
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="!form.name">{{ editing() ? 'Guardar' : 'Crear' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class MetersPageComponent implements OnInit {
  private readonly service = inject(MetersService);
  private readonly tariffsSvc = inject(TariffsService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly meters = signal<Meter[]>([]);
  readonly tariffs = signal<Tariff[]>([]);
  readonly showModal = signal(false);
  readonly editing = signal<Meter | null>(null);

  readonly form = {
    name: '',
    utilityType: 'electricity',
    location: '',
    tariffId: null as string | null,
  };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.meters.set(await this.service.list());
    } finally {
      this.loading.set(false);
    }
  }

  async loadTariffs(): Promise<void> {
    this.tariffs.set(await this.tariffsSvc.list());
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.name = '';
    this.form.utilityType = 'electricity';
    this.form.location = '';
    this.form.tariffId = null;
    this.showModal.set(true);
    void this.loadTariffs();
  }

  openEdit(m: Meter): void {
    this.editing.set(m);
    this.form.name = m.name;
    this.form.utilityType = m.utilityType;
    this.form.location = m.location ?? '';
    this.form.tariffId = m.tariffId;
    this.showModal.set(true);
    void this.loadTariffs();
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  async save(): Promise<void> {
    try {
      if (this.editing()) {
        await this.service.update(this.editing()!.id, {
          name: this.form.name,
          location: this.form.location,
          tariffId: this.form.tariffId ?? undefined,
        });
        this.toast.success('Contador actualizado');
      } else {
        await this.service.create({
          name: this.form.name,
          utilityType: this.form.utilityType,
          location: this.form.location,
          tariffId: this.form.tariffId ?? undefined,
        });
        this.toast.success('Contador creado');
      }
      this.showModal.set(false);
      await this.load();
    } catch {
      this.toast.error('No se pudo guardar el contador');
    }
  }

  utilityLabel(u: string): string {
    return u === 'electricity' ? 'Electricidad' : u === 'water' ? 'Agua' : 'Gas';
  }
}
