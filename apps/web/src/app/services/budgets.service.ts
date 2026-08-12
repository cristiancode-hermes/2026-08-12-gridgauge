import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Budget } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class BudgetsService {
  private readonly http = inject(HttpClient);

  list(period: string): Promise<Budget[]> {
    return lastValueFrom(this.http.get<Budget[]>(`/api/budgets?period=${period}`));
  }

  create(dto: { meterId: string; period: string; amount: number }): Promise<Budget> {
    return lastValueFrom(this.http.post<Budget>('/api/budgets', dto));
  }

  update(id: string, dto: { amount: number }): Promise<Budget> {
    return lastValueFrom(this.http.patch<Budget>(`/api/budgets/${id}`, dto));
  }

  remove(id: string): Promise<void> {
    return lastValueFrom(this.http.delete<void>(`/api/budgets/${id}`));
  }
}
