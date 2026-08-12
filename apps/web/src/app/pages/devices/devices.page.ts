import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DevicesService } from '../../services/devices.service';
import { MetersService } from '../../services/meters.service';
import { ToastService } from '../../services/toast.service';
import { Device, Meter } from '../../interfaces/models';
import { BadgeComponent } from '../../shared/badge.component';
import { SkeletonComponent } from '../../shared/skeleton.component';
import { EmptyStateComponent } from '../../shared/empty-state.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [FormsModule, BadgeComponent, SkeletonComponent, EmptyStateComponent, ModalComponent],
  template: `
    <div style="display: flex; align-items: baseline; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <div>
        <h1 class="page-title">Dispositivos</h1>
        <p class="page-sub">Electrodomésticos y reparto estimado del consumo.</p>
      </div>
      <button class="btn btn-primary" (click)="openCreate()">+ Nuevo dispositivo</button>
    </div>

    @if (loading()) {
      <app-skeleton [rows]="4" />
    } @else if (!devices().length) {
      <div class="card"><app-empty-state icon="▣" title="Sin dispositivos" message="Añade tus electrodomésticos para estimar cuánto consumen." actionLabel="Añadir dispositivo" (action)="openCreate()" /></div>
    } @else {
      <div class="card" style="padding: 0;">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr><th>Dispositivo</th><th>Contador</th><th class="num">Potencia (W)</th><th class="num">Horas/día</th><th class="num">kWh/día</th><th class="num">% del total</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (d of devices(); track d.id) {
                <tr>
                  <td style="font-weight: 500;">{{ d.name }}</td>
                  <td style="color: var(--gg-muted);">{{ d.meter?.name || '—' }}</td>
                  <td class="num">{{ d.wattage }}</td>
                  <td class="num">{{ d.hoursPerDay }}</td>
                  <td class="num">{{ (d.kwhPerDay ?? 0).toFixed(2) }}</td>
                  <td class="num">{{ (d.sharePct ?? 0).toFixed(1) }}%</td>
                  <td>@if (d.active) { <app-badge kind="status" status="on_track" label="Activo" /> } @else { <app-badge kind="plain" label="Inactivo" /> }</td>
                  <td>
                    <div class="row-actions">
                      <button class="btn btn-ghost btn-sm" (click)="openEdit(d)">Editar</button>
                      <button class="btn btn-ghost btn-sm" (click)="remove(d)">Borrar</button>
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
      <app-modal [title]="editing() ? 'Editar dispositivo' : 'Nuevo dispositivo'" (close)="showModal.set(false)">
        <form (ngSubmit)="save()">
          <div class="field">
            <label>Nombre</label>
            <input class="input" [(ngModel)]="form.name" name="name" required placeholder="Frigorífico" />
          </div>
          <div class="field">
            <label>Contador</label>
            <select class="input" [(ngModel)]="form.meterId" name="meterId" required>
              <option value="" disabled>Selecciona…</option>
              @for (m of meters(); track m.id) {
                <option [value]="m.id">{{ m.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label>Potencia (vatios)</label>
            <input class="input" type="number" step="1" min="1" [(ngModel)]="form.wattage" name="wattage" required />
          </div>
          <div class="field">
            <label>Horas de uso al día</label>
            <input class="input" type="number" step="0.5" min="0.5" [(ngModel)]="form.hoursPerDay" name="hours" required />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="showModal.set(false)">Cancelar</button>
            <button type="submit" class="btn btn-primary" [disabled]="!form.name || !form.meterId">Guardar</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class DevicesPageComponent implements OnInit {
  private readonly service = inject(DevicesService);
  private readonly metersSvc = inject(MetersService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly devices = signal<Device[]>([]);
  readonly meters = signal<Meter[]>([]);
  readonly showModal = signal(false);
  readonly editing = signal<Device | null>(null);

  readonly form = {
    name: '',
    meterId: '',
    wattage: 100,
    hoursPerDay: 4,
  };

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.devices.set(await this.service.list());
    } finally {
      this.loading.set(false);
    }
  }

  async openCreate(): Promise<void> {
    this.editing.set(null);
    this.form.name = '';
    this.form.meterId = '';
    this.form.wattage = 100;
    this.form.hoursPerDay = 4;
    this.meters.set(await this.metersSvc.list());
    this.showModal.set(true);
  }

  async openEdit(d: Device): Promise<void> {
    this.editing.set(d);
    this.form.name = d.name;
    this.form.meterId = d.meterId;
    this.form.wattage = d.wattage;
    this.form.hoursPerDay = d.hoursPerDay;
    this.meters.set(await this.metersSvc.list());
    this.showModal.set(true);
  }

  async save(): Promise<void> {
    try {
      if (this.editing()) {
        await this.service.update(this.editing()!.id, {
          name: this.form.name,
          wattage: Number(this.form.wattage),
          hoursPerDay: Number(this.form.hoursPerDay),
        });
        this.toast.success('Dispositivo actualizado');
      } else {
        await this.service.create({
          meterId: this.form.meterId,
          name: this.form.name,
          wattage: Number(this.form.wattage),
          hoursPerDay: Number(this.form.hoursPerDay),
        });
        this.toast.success('Dispositivo creado');
      }
      this.showModal.set(false);
      await this.load();
    } catch {
      this.toast.error('No se pudo guardar');
    }
  }

  async remove(d: Device): Promise<void> {
    if (!confirm(`¿Borrar «${d.name}»?`)) return;
    try {
      await this.service.remove(d.id);
      this.toast.success('Dispositivo borrado');
      await this.load();
    } catch {
      this.toast.error('No se pudo borrar');
    }
  }
}
