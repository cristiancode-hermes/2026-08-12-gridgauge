import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Anomaly, DetectResult, Paged } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class AnomaliesService {
  private readonly http = inject(HttpClient);

  list(params: { type?: string; severity?: string; status?: string; page?: number; limit?: number }): Promise<Paged<Anomaly>> {
    const q = new URLSearchParams();
    if (params.type) q.set('type', params.type);
    if (params.severity) q.set('severity', params.severity);
    if (params.status) q.set('status', params.status);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return lastValueFrom(this.http.get<Paged<Anomaly>>(`/api/anomalies?${q.toString()}`));
  }

  resolve(id: string, note?: string): Promise<Anomaly> {
    return lastValueFrom(this.http.patch<Anomaly>(`/api/anomalies/${id}/resolve`, { note }));
  }

  dismiss(id: string): Promise<Anomaly> {
    return lastValueFrom(this.http.patch<Anomaly>(`/api/anomalies/${id}/dismiss`, {}));
  }

  detect(): Promise<DetectResult> {
    return lastValueFrom(this.http.post<DetectResult>('/api/anomalies/detect', {}));
  }
}
