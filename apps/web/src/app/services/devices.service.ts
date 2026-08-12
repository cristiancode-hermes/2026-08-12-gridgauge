import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Device } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class DevicesService {
  private readonly http = inject(HttpClient);

  list(): Promise<Device[]> {
    return lastValueFrom(this.http.get<Device[]>('/api/devices'));
  }

  create(dto: { meterId: string; name: string; wattage: number; hoursPerDay: number }): Promise<Device> {
    return lastValueFrom(this.http.post<Device>('/api/devices', dto));
  }

  update(id: string, dto: { name?: string; wattage?: number; hoursPerDay?: number; active?: boolean }): Promise<Device> {
    return lastValueFrom(this.http.patch<Device>(`/api/devices/${id}`, dto));
  }

  remove(id: string): Promise<void> {
    return lastValueFrom(this.http.delete<void>(`/api/devices/${id}`));
  }
}
