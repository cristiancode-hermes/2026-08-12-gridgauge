import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { User } from '../interfaces/models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  updateCo2(factors: { electricity: number; water: number; gas: number }): Promise<User> {
    return lastValueFrom(this.http.patch<User>('/api/settings/co2', factors));
  }

  updatePrefs(prefs: { spikeThresholdSigma?: number; quietWindow?: { start: string; end: string }; quietWindowEnabled?: boolean }): Promise<User> {
    return lastValueFrom(this.http.patch<User>('/api/settings/prefs', prefs));
  }
}
