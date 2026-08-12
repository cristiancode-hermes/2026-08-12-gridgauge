import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div class="card" style="padding: 0; overflow: hidden;">
      @for (row of [].constructor(rows()); track $index) {
        <div style="display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--gg-border-soft);">
          <div class="skeleton" style="width: 34px; height: 34px; border-radius: 8px;"></div>
          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
            <div class="skeleton" style="height: 10px; width: 55%;"></div>
            <div class="skeleton" style="height: 10px; width: 30%;"></div>
          </div>
          <div class="skeleton" style="height: 10px; width: 56px;"></div>
        </div>
      }
    </div>
  `,
})
export class SkeletonComponent {
  readonly rows = input(3);
}
