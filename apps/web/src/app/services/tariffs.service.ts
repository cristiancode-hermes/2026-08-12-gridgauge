import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { PeakOffPeak, Tariff, Tier } from '../interfaces/models';

export interface TariffDto {
  name: string;
  utilityType: string;
  unitPrice: number;
  fixedFee: number;
  tiers?: Tier[] | null;
  peakOffPeak?: PeakOffPeak | null;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TariffsService {
  private readonly http = inject(HttpClient);

  list(): Promise<Tariff[]> {
    return lastValueFrom(this.http.get<Tariff[]>('/api/tariffs'));
  }

  get(id: string): Promise<Tariff> {
    return lastValueFrom(this.http.get<Tariff>(`/api/tariffs/${id}`));
  }

  create(dto: TariffDto): Promise<Tariff> {
    return lastValueFrom(this.http.post<Tariff>('/api/tariffs', dto));
  }

  update(id: string, dto: Partial<TariffDto>): Promise<Tariff> {
    return lastValueFrom(this.http.patch<Tariff>(`/api/tariffs/${id}`, dto));
  }

  remove(id: string): Promise<void> {
    return lastValueFrom(this.http.delete<void>(`/api/tariffs/${id}`));
  }

  duplicate(id: string): Promise<Tariff> {
    return lastValueFrom(this.http.post<Tariff>(`/api/tariffs/${id}/duplicate`, {}));
  }
}
