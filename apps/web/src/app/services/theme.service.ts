import { Injectable, effect, signal } from '@angular/core';

const THEME_KEY = 'gg_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isLight = signal<boolean>(false);

  constructor() {
    const stored = localStorage.getItem(THEME_KEY);
    const light = stored === 'light';
    this.isLight.set(light);

    effect(() => {
      this.applyTheme(this.isLight());
    });
  }

  toggle(): void {
    this.isLight.update((v) => !v);
  }

  private applyTheme(light: boolean): void {
    document.documentElement.classList.toggle('light', light);
    document.documentElement.classList.toggle('dark', !light);
    localStorage.setItem(THEME_KEY, light ? 'light' : 'dark');
  }
}
