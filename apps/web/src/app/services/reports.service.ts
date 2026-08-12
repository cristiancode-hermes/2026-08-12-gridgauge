import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Report } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);

  get(year: number, month: number): Promise<Report> {
    return lastValueFrom(this.http.get<Report>(`/api/reports/${year}/${month}`));
  }

  exportCsv(year: number, month: number): Promise<Blob> {
    return lastValueFrom(
      this.http.get(`/api/reports/${year}/${month}/export`, { responseType: 'blob' }),
    );
  }
}
