import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { DashboardSummary } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  summary(): Promise<DashboardSummary> {
    return lastValueFrom(this.http.get<DashboardSummary>('/api/dashboard/summary'));
  }
}
