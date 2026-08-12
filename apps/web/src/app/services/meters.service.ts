import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Meter, MeterStats, Paged, Reading, Series } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class MetersService {
  private readonly http = inject(HttpClient);

  list(): Promise<Meter[]> {
    return lastValueFrom(this.http.get<Meter[]>('/api/meters'));
  }

  get(id: string): Promise<Meter> {
    return lastValueFrom(this.http.get<Meter>(`/api/meters/${id}`));
  }

  create(dto: { name: string; utilityType: string; location?: string; serialNumber?: string; tariffId?: string; active?: boolean }): Promise<Meter> {
    return lastValueFrom(this.http.post<Meter>('/api/meters', dto));
  }

  update(id: string, dto: { name?: string; location?: string; tariffId?: string; active?: boolean }): Promise<Meter> {
    return lastValueFrom(this.http.patch<Meter>(`/api/meters/${id}`, dto));
  }

  remove(id: string): Promise<void> {
    return lastValueFrom(this.http.delete<void>(`/api/meters/${id}`));
  }

  readings(id: string, page = 1, limit = 25, from?: string, to?: string): Promise<Paged<Reading>> {
    let q = `/api/meters/${id}/readings?page=${page}&limit=${limit}`;
    if (from) q += `&from=${encodeURIComponent(from)}`;
    if (to) q += `&to=${encodeURIComponent(to)}`;
    return lastValueFrom(this.http.get<Paged<Reading>>(q));
  }

  addReading(id: string, dto: { periodStart: string; periodEnd: string; value: number; notes?: string }): Promise<Reading> {
    return lastValueFrom(this.http.post<Reading>(`/api/meters/${id}/readings`, dto));
  }

  bulkImport(id: string, file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const fd = new FormData();
    fd.append('file', file);
    return lastValueFrom(this.http.post<{ imported: number; skipped: number; errors: string[] }>(`/api/meters/${id}/readings/bulk`, fd));
  }

  deleteReading(readingId: string): Promise<void> {
    return lastValueFrom(this.http.delete<void>(`/api/readings/${readingId}`));
  }

  series(id: string, days = 30): Promise<Series> {
    return lastValueFrom(this.http.get<Series>(`/api/meters/${id}/series?days=${days}`));
  }

  stats(id: string, period: string): Promise<MeterStats> {
    return lastValueFrom(this.http.get<MeterStats>(`/api/meters/${id}/stats?period=${period}`));
  }
}
